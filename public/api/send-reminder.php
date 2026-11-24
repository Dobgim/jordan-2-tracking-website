<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function requestAuthorization(): string
{
    $value = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($value === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $header) {
            if (strtolower($name) === 'authorization') {
                $value = $header;
                break;
            }
        }
    }

    return is_string($value) && preg_match('/^Bearer\s+([^\s]+)$/i', $value, $matches)
        ? $matches[1]
        : '';
}

function supabaseRequest(array $config, string $token, string $method, string $path): array
{
    $curl = curl_init(rtrim($config['supabase_url'], '/') . $path);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . $config['supabase_anon_key'],
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
            'Content-Type: application/json',
        ],
    ]);
    if ($method === 'POST') {
        curl_setopt($curl, CURLOPT_POSTFIELDS, '{}');
    }

    $body = curl_exec($curl);
    if ($body === false) {
        curl_close($curl);
        respond(502, ['error' => 'Could not verify admin access with the account service.']);
    }

    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    return [$status, json_decode($body, true)];
}

function escapeHtml($value): string
{
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Use POST to send a shipment reminder.']);
}

$configPath = getenv('REMINDER_CONFIG_PATH') ?: dirname(__DIR__, 2) . '/private/reminder-config.php';
if (!is_file($configPath) || !is_readable($configPath)) {
    respond(503, ['error' => 'Email is not configured on this hosting account. Add the private reminder configuration file outside public_html.']);
}

$config = require $configPath;
if (!is_array($config)) {
    respond(500, ['error' => 'The private reminder configuration is invalid.']);
}
if (!extension_loaded('curl') || !extension_loaded('openssl')) {
    respond(503, ['error' => 'This hosting account needs PHP cURL and OpenSSL enabled to send reminders securely.']);
}

$requiredConfig = ['supabase_url', 'supabase_anon_key', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'from_email'];
foreach ($requiredConfig as $key) {
    if (!isset($config[$key]) || trim((string) $config[$key]) === '') {
        respond(503, ['error' => 'Email configuration is incomplete. Check the private reminder configuration file.']);
    }
}
if ($config['smtp_password'] === 'REPLACE_WITH_MAILBOX_PASSWORD') {
    respond(503, ['error' => 'Add the mailbox password to the private reminder configuration file.']);
}
if (strpos((string) $config['supabase_url'], 'https://') !== 0 ||
    !filter_var($config['from_email'], FILTER_VALIDATE_EMAIL) ||
    !filter_var($config['smtp_username'], FILTER_VALIDATE_EMAIL) ||
    (int) $config['smtp_port'] < 1 ||
    (int) $config['smtp_port'] > 65535) {
    respond(503, ['error' => 'Email configuration contains an invalid Supabase URL or sender address.']);
}

$rawBody = file_get_contents('php://input');
$request = json_decode($rawBody === false ? '' : $rawBody, true);
if (!is_array($request) || !isset($request['shipment_id']) ||
    !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', (string) $request['shipment_id'])) {
    respond(400, ['error' => 'A valid shipment ID is required.']);
}

$token = requestAuthorization();
if ($token === '') {
    respond(401, ['error' => 'Please sign in as an admin to send a reminder.']);
}

[$adminStatus, $isAdmin] = supabaseRequest($config, $token, 'POST', '/rest/v1/rpc/is_admin');
if ($adminStatus !== 200 || $isAdmin !== true) {
    respond(403, ['error' => 'Only signed-in admins can send shipment reminders.']);
}

$shipmentId = rawurlencode((string) $request['shipment_id']);
$shipmentPath = '/rest/v1/shipments?id=eq.' . $shipmentId .
    '&select=tracking_number,status,origin,destination,freight_type,weight,estimated_delivery,estimated_delivery_time,sender,receiver';
[$shipmentStatus, $shipments] = supabaseRequest($config, $token, 'GET', $shipmentPath);
if ($shipmentStatus !== 200) {
    respond(502, ['error' => 'Could not load this shipment. Refresh the admin page and try again.']);
}
if (!is_array($shipments) || count($shipments) !== 1) {
    respond(404, ['error' => 'Shipment not found.']);
}

$shipment = $shipments[0];
$recipients = [];
foreach (['sender', 'receiver'] as $role) {
    $party = is_array($shipment[$role] ?? null) ? $shipment[$role] : [];
    $email = trim((string) ($party['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        continue;
    }

    $key = strtolower($email);
    if (!isset($recipients[$key])) {
        $recipients[$key] = [
            'email' => $email,
            'name' => trim((string) ($party['name'] ?? '')),
        ];
    }
}
if ($recipients === []) {
    respond(422, ['error' => 'This shipment has no valid sender or receiver email address.']);
}

require_once __DIR__ . '/vendor/PHPMailer/src/Exception.php';
require_once __DIR__ . '/vendor/PHPMailer/src/SMTP.php';
require_once __DIR__ . '/vendor/PHPMailer/src/PHPMailer.php';

$siteUrl = rtrim((string) ($config['site_url'] ?? ''), '/');
if ($siteUrl === '') {
    $siteUrl = 'https://' . ($_SERVER['HTTP_HOST'] ?? '');
}
if (!preg_match('/^https?:\/\//i', $siteUrl)) {
    $siteUrl = 'https://' . $siteUrl;
}
$trackingNumber = (string) ($shipment['tracking_number'] ?? '');
$trackUrl = $siteUrl . '/track?code=' . rawurlencode($trackingNumber);
$status = (string) ($shipment['status'] ?? 'Unknown');
$subject = 'Shipment status reminder: ' . $trackingNumber . ' — ' . $status;
$rows = [
    'Tracking number' => $trackingNumber,
    'Current status' => $status,
    'From' => (string) ($shipment['origin'] ?? ''),
    'To' => (string) ($shipment['destination'] ?? ''),
    'Freight' => (string) ($shipment['freight_type'] ?? ''),
    'Weight' => (string) ($shipment['weight'] ?? ''),
    'Expected delivery' => trim(
        (string) ($shipment['estimated_delivery'] ?? '') . ' ' .
        (string) ($shipment['estimated_delivery_time'] ?? '')
    ),
];
$rows = array_filter($rows, static function ($value): bool {
    return trim($value) !== '';
});
$tableRows = '';
foreach ($rows as $label => $value) {
    $tableRows .= '<tr><td style="padding:9px 0;border-bottom:1px solid #eeeff3;color:#6b7090;width:42%">' .
        escapeHtml($label) . '</td><td style="padding:9px 0;border-bottom:1px solid #eeeff3;font-weight:bold">' .
        escapeHtml($value) . '</td></tr>';
}

$sent = 0;
$failed = 0;
foreach ($recipients as $recipient) {
    $name = $recipient['name'] !== '' ? $recipient['name'] : 'there';
    $mailer = new PHPMailer(true);
    try {
        $mailer->isSMTP();
        $mailer->Host = (string) $config['smtp_host'];
        $mailer->SMTPAuth = true;
        $mailer->Username = (string) $config['smtp_username'];
        $mailer->Password = (string) $config['smtp_password'];
        $mailer->Port = (int) $config['smtp_port'];
        $encryption = strtolower((string) ($config['smtp_encryption'] ?? 'ssl'));
        if ($encryption === 'ssl') {
            $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($encryption === 'tls') {
            $mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            respond(503, ['error' => 'SMTP encryption must be set to ssl or tls.']);
        }
        $mailer->Timeout = 20;
        $mailer->CharSet = 'UTF-8';
        $mailer->setFrom(
            (string) $config['from_email'],
            (string) ($config['from_name'] ?? 'Shipment Support')
        );
        if (isset($config['reply_to']) && filter_var($config['reply_to'], FILTER_VALIDATE_EMAIL)) {
            $mailer->addReplyTo((string) $config['reply_to']);
        }
        $mailer->addAddress($recipient['email'], $recipient['name']);
        $mailer->Subject = $subject;
        $mailer->isHTML(true);
        $mailer->Body = '<!doctype html><html><body style="margin:0;background:#f3f3f6;font-family:Arial,Helvetica,sans-serif;color:#11194e">' .
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f6;padding:24px 12px"><tr><td align="center">' .
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden">' .
            '<tr><td style="background:#11194e;padding:22px 28px;color:#fff"><div style="font-size:18px;font-weight:bold">' .
            escapeHtml($config['from_name'] ?? 'Shipment Support') . '</div><div style="font-size:13px;color:#c9cbe0;margin-top:2px">Shipment notification</div></td></tr>' .
            '<tr><td style="height:4px;background:#fe000b"></td></tr><tr><td style="padding:28px">' .
            '<h1 style="margin:0 0 12px;font-size:21px">Shipment status reminder</h1>' .
            '<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#3b4060">Hello ' . escapeHtml($name) .
            ',<br>This is a reminder to check the latest progress for your shipment.</p>' .
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">' .
            $tableRows . '</table><p style="margin:24px 0 8px;text-align:center"><a href="' . escapeHtml($trackUrl) .
            '" style="display:inline-block;background:#fe000b;color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:8px;font-size:15px">Track your shipment</a></p>' .
            '<p style="margin:0;text-align:center;font-size:12px;color:#8a8fa6">View the latest shipment status and tracking history.</p>' .
            '</td></tr><tr><td style="background:#f7f7fa;padding:16px 28px;font-size:12px;line-height:1.6;color:#6b7090">' .
            escapeHtml($config['reply_to'] ?? $config['from_email']) . '</td></tr></table></td></tr></table></body></html>';
        $mailer->AltBody = "Hello {$name},\n\nThis is a reminder to check the latest progress for your shipment.\n" .
            "Tracking number: {$trackingNumber}\nCurrent status: {$status}\nFrom: " . ($shipment['origin'] ?? '') .
            "\nTo: " . ($shipment['destination'] ?? '') . "\n\nTrack your shipment: {$trackUrl}";
        $mailer->send();
        $sent++;
    } catch (Throwable $exception) {
        error_log('Shipment reminder email failed: ' . $mailer->ErrorInfo);
        $failed++;
    }
}

if ($sent === 0) {
    respond(502, ['sent' => 0, 'failed' => $failed, 'error' => 'Email could not be sent. Check the SMTP host, port, username, password, and mailbox settings.']);
}

respond(200, [
    'sent' => $sent,
    'failed' => $failed,
    'error' => $failed > 0 ? 'Some reminder emails could not be sent. Check the SMTP settings.' : null,
]);
