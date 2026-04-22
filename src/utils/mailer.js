const net = require('net');
const tls = require('tls');

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || user;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  if (!host || !from) return null;
  return { host, port, user, pass, from, secure };
}

function toBase64(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64');
}

function sanitizeHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function buildMessage({ from, to, subject, text }) {
  const safeFrom = sanitizeHeader(from);
  const safeTo = sanitizeHeader(to);
  const safeSubject = sanitizeHeader(subject);

  return [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="utf-8"',
    '',
    String(text || '')
  ].join('\r\n');
}

function createSocket(config) {
  if (config.secure) {
    return tls.connect({ host: config.host, port: config.port, rejectUnauthorized: false });
  }
  return net.connect({ host: config.host, port: config.port });
}

function createLineReader(socket) {
  let buffer = '';
  const waiting = [];

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || '';

    for (const line of parts) {
      if (!line) continue;
      if (waiting.length) {
        const resolver = waiting.shift();
        resolver(line);
      }
    }
  });

  return () => new Promise((resolve) => waiting.push(resolve));
}

async function readReply(readLine) {
  let line = await readLine();
  if (!line) return { code: 0, lines: [] };

  const code = Number(line.slice(0, 3));
  const lines = [line];

  while (line[3] === '-') {
    line = await readLine();
    lines.push(line);
  }

  return { code, lines };
}

async function sendCommand(socket, readLine, command, expectedCodes) {
  if (command) socket.write(`${command}\r\n`);
  const reply = await readReply(readLine);

  if (expectedCodes && expectedCodes.length && !expectedCodes.includes(reply.code)) {
    throw new Error(`SMTP command failed (${command || 'initial'}): ${reply.lines.join(' | ')}`);
  }

  return reply;
}

async function sendEmail({ to, subject, text }) {
  const config = getSmtpConfig();
  if (!config || !to) {
    return { skipped: true, reason: 'SMTP is not configured or recipient missing' };
  }

  const socket = createSocket(config);
  const readLine = createLineReader(socket);

  const closeSocket = () => {
    if (!socket.destroyed) socket.end();
  };

  try {
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });

    await sendCommand(socket, readLine, '', [220]);
    await sendCommand(socket, readLine, `EHLO ${config.host}`, [250]);

    if (config.user && config.pass) {
      await sendCommand(socket, readLine, 'AUTH LOGIN', [334]);
      await sendCommand(socket, readLine, toBase64(config.user), [334]);
      await sendCommand(socket, readLine, toBase64(config.pass), [235]);
    }

    await sendCommand(socket, readLine, `MAIL FROM:<${config.from}>`, [250]);
    await sendCommand(socket, readLine, `RCPT TO:<${to}>`, [250, 251]);
    await sendCommand(socket, readLine, 'DATA', [354]);

    const payload = `${buildMessage({ from: config.from, to, subject, text })}\r\n.\r\n`;
    socket.write(payload);
    await sendCommand(socket, readLine, '', [250]);
    await sendCommand(socket, readLine, 'QUIT', [221]);

    closeSocket();
    return { success: true };
  } catch (error) {
    closeSocket();
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail };
