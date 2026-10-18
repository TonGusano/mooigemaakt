<?php
/*
 * MooiGemaakt – verwerkt het contactformulier en stuurt het bericht per e-mail door.
 * Draait op de hosting van Hostinger (PHP mail-functie).
 *
 * Komen berichten niet aan? Maak dan in hPanel (E-mails) het adres AFZENDER hieronder aan,
 * of verander AFZENDER in een bestaand e-mailadres op mooigemaakt.net.
 */

const ONTVANGER = 'smask2018@gmail.com';
const AFZENDER = 'noreply@mooigemaakt.net';
const MAX_BESTAND = 10 * 1024 * 1024; // 10 MB
const TOEGESTANE_BESTANDEN = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'zip'];

$wilJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function antwoord(bool $ok, string $melding, int $status = 200): void
{
    global $wilJson;
    http_response_code($status);
    if ($wilJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'melding' => $melding]);
    } else {
        header('Location: contact.html?' . ($ok ? 'verzonden=1' : 'fout=1'));
    }
    exit;
}

function veld(string $naam, int $max = 5000): string
{
    $waarde = trim((string) ($_POST[$naam] ?? ''));
    return mb_substr($waarde, 0, $max);
}

function eenRegel(string $tekst): string
{
    return trim(preg_replace('/[\r\n]+/', ' ', $tekst));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    antwoord(false, 'Alleen versturen via het formulier is mogelijk.', 405);
}

// Spamval: dit verborgen veld blijft leeg bij echte bezoekers.
if (veld('_gotcha') !== '') {
    antwoord(true, 'Bedankt voor je bericht.');
}

$naam = eenRegel(veld('naam', 200));
$email = eenRegel(veld('email', 200));
$onderwerp = eenRegel(veld('onderwerp', 100));
$bericht = veld('bericht');
$voorwie = eenRegel(veld('voorwie', 300));
$voorkeur = eenRegel(veld('contactvoorkeur', 50));
$toestemming = veld('toestemming', 10);

if ($naam === '' || $onderwerp === '' || $bericht === '' || $voorwie === '' || $voorkeur === ''
    || $toestemming !== 'ja' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    antwoord(false, 'Niet alle verplichte velden zijn goed ingevuld.', 422);
}

$regels = [
    'Naam' => $naam,
    'Bedrijf of organisatie' => eenRegel(veld('organisatie', 200)),
    'E-mailadres' => $email,
    'Telefoon' => eenRegel(veld('telefoon', 50)),
    'Onderwerp' => $onderwerp,
    'Voor wie' => $voorwie,
    'Gewenste opleverdatum' => eenRegel(veld('opleverdatum', 20)),
    'Contactvoorkeur' => $voorkeur,
    'Link naar materiaal' => eenRegel(veld('link', 500)),
];

$tekst = "Nieuwe aanvraag via mooigemaakt.net\n\n";
foreach ($regels as $label => $waarde) {
    if ($waarde !== '') {
        $tekst .= $label . ': ' . $waarde . "\n";
    }
}
$tekst .= "\nWat wil je laten maken?\n" . $bericht . "\n";
$materiaal = veld('materiaal');
if ($materiaal !== '') {
    $tekst .= "\nAl aanwezig materiaal:\n" . $materiaal . "\n";
}
$tekst .= "\nToestemming voor verwerking van gegevens: ja\n";

// Optionele bijlage
$bijlage = null;
if (!empty($_FILES['bestand']) && ($_FILES['bestand']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $f = $_FILES['bestand'];
    $extensie = strtolower(pathinfo((string) $f['name'], PATHINFO_EXTENSION));
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > MAX_BESTAND) {
        antwoord(false, 'Het bestand is te groot (maximaal 10 MB) of kon niet worden geüpload. Stuur anders een link.', 422);
    }
    if (!in_array($extensie, TOEGESTANE_BESTANDEN, true)) {
        antwoord(false, 'Dit soort bestand kan niet worden meegestuurd. Stuur anders een link.', 422);
    }
    $bijlage = [
        'naam' => preg_replace('/[^A-Za-z0-9._-]+/', '_', basename((string) $f['name'])),
        'inhoud' => file_get_contents($f['tmp_name']),
    ];
}

$titel = '=?UTF-8?B?' . base64_encode('Nieuwe aanvraag via mooigemaakt.net: ' . $onderwerp) . '?=';
$afzenderNaam = '=?UTF-8?B?' . base64_encode('MooiGemaakt website') . '?=';
$kopregels = [
    'From: ' . $afzenderNaam . ' <' . AFZENDER . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
];

if ($bijlage === null) {
    $kopregels[] = 'Content-Type: text/plain; charset=UTF-8';
    $kopregels[] = 'Content-Transfer-Encoding: base64';
    $inhoud = chunk_split(base64_encode($tekst));
} else {
    $grens = 'mg_' . bin2hex(random_bytes(12));
    $kopregels[] = 'Content-Type: multipart/mixed; boundary="' . $grens . '"';
    $inhoud = '--' . $grens . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($tekst)) . "\r\n"
        . '--' . $grens . "\r\n"
        . 'Content-Type: application/octet-stream; name="' . $bijlage['naam'] . "\"\r\n"
        . "Content-Transfer-Encoding: base64\r\n"
        . 'Content-Disposition: attachment; filename="' . $bijlage['naam'] . "\"\r\n\r\n"
        . chunk_split(base64_encode($bijlage['inhoud'])) . "\r\n"
        . '--' . $grens . "--\r\n";
}

$gelukt = mail(ONTVANGER, $titel, $inhoud, implode("\r\n", $kopregels), '-f' . AFZENDER);

if (!$gelukt) {
    antwoord(false, 'Het versturen is niet gelukt. Probeer het later opnieuw of stuur een e-mail.', 500);
}
antwoord(true, 'Bedankt voor je bericht.');
