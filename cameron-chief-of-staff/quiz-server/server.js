// Builder Quiz Submission Server
// Receives quiz form POSTs, creates GHL contacts + opportunities + sends emails
// Run: node server.js

const http = require('http')
const https = require('https')

const PORT = 3847
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'pkNKuHS8wz0aQmZKEXHr'
const GHL_TOKEN = process.env.GHL_PIT_TOKEN
const GHL_VERSION = process.env.GHL_API_VERSION || '2021-07-28'

const STAGES = {
  qualified: '71eaa245-9a3a-4fa5-b9cd-bd3149bbd4f5',
  nurture:   '30921a20-b008-42b1-b63e-bf000b208c31',
  notFit:    '775bb5e0-cd90-49a4-b8bf-2c7ca6f0b03b',
}
const PIPELINE_ID = 'bqgcfXAAye7xiSAjzTKn'
const QUIZ_SCORE_FIELD_ID = 'TxdbQKu5jypTzz8TzaWp'

// ─── EMAIL TEMPLATES ───────────────────────────────────────────────────────

function getEmailTemplate(score, firstName) {
  const name = firstName || 'there'

  if (score >= 15) {
    return {
      subject: 'You qualified — here\'s what that actually means',
      html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.7;">
<p>Hey ${name},</p>
<p>I just saw your quiz results come through, and I wanted to reach out personally before you move on with your day.</p>
<p>You scored in the top tier. That doesn't happen by accident — it means the way you answered those questions matches the profile of women who actually build something real with this business model. Not dabble. Build.</p>
<p>I want to be straight with you about what that means.</p>
<p>This isn't a thing you join and immediately start making money. There's a learning curve. There's work. There's a period where you're putting in before the residual income starts stacking up.</p>
<p>But if you do the work — and based on your answers, you're the kind of person who does — you're building income that compounds. That keeps coming in when you're on vacation. That doesn't reset at the end of the month.</p>
<p>You already know what it feels like to be valuable and underpaid. To work hard and watch someone else benefit more from it than you do. To have a ceiling you can't break through no matter how much you perform.</p>
<p>This is the door out of that.</p>
<p>The next step is simple: a Zoom call with me. No pressure. No script. A real conversation where you can ask me anything — about the business, about what I actually make, about what the first 90 days look like, about the hard parts nobody puts in the highlight reel.</p>
<p>If it's a fit, we'll talk about next steps. If it's not, I'll tell you that too.</p>
<p><a href="https://link.switchtoamerica.com/widget/bookings/boostyourincome" style="display:inline-block;background:#C8102E;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif;">→ Book Your Zoom Here</a></p>
<p>I open limited spots each week. Grab yours while it's there.</p>
<p>Talk soon,<br><strong>Shannon</strong></p>
<hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
<p style="font-size:12px;color:#666;">Switch to America | switchtoamerica.com<br>Results not typical. Individual results vary based on effort, experience, and market conditions.</p>
</div>`
    }
  }

  if (score >= 8) {
    return {
      subject: 'You\'re not quite there yet — but you\'re close',
      html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.7;">
<p>Hey ${name},</p>
<p>Your quiz results said you're not quite ready to build right now. And I'm not going to try to talk you out of that.</p>
<p>But I do want to say something I wish I'd heard earlier in my own career — before I spent years being excellent at someone else's company and wondering why that never felt like enough.</p>
<p>Nobody tells you that the rules of the traditional career path were written for a different economy. Work hard, get promoted, stay loyal, retire comfortable. That was the deal.</p>
<p>Except the companies stopped holding up their end. Layoffs happen to top performers. Loyalty doesn't protect you anymore. And "comfortable retirement" is starting to look like a myth for a lot of people who did everything right.</p>
<p>I'm not saying that to scare you. I'm saying it because I was in it — and I know what it feels like to suspect the game is rigged but not know what else to do.</p>
<p>What I do now is different. I build income that doesn't depend on one employer, one economy, or one decision made in a boardroom I'll never be in.</p>
<p>Over the next few weeks, I'll share honest information about how this works — no pitch hiding around every corner. Just real stuff from someone who's in it.</p>
<p>And if six months from now you read something I send and think — <em>okay, I think I'm ready for that call</em> — I'll be here.</p>
<p>Talk soon,<br><strong>Shannon</strong></p>
<p><a href="https://theshannonnicole.com" style="color:#C8102E;">Learn more at theshannonnicole.com</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
<p style="font-size:12px;color:#666;">Switch to America | switchtoamerica.com</p>
</div>`
    }
  }

  return {
    subject: 'Thanks for taking the quiz',
    html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.7;">
<p>Hey ${name},</p>
<p>Thank you for taking the quiz. Based on your answers, this probably isn't the right moment — and that's okay.</p>
<p>This opportunity is built for women who are all-in, and it sounds like you're not quite there yet. If that changes, the door isn't closed.</p>
<p>In the meantime, feel free to follow along at <a href="https://theshannonnicole.com" style="color:#C8102E;">theshannonnicole.com</a> — I share honest content about building income outside of a traditional job.</p>
<p>Talk soon,<br><strong>Shannon</strong></p>
<hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
<p style="font-size:12px;color:#666;">Switch to America | switchtoamerica.com</p>
</div>`
  }
}

// ─── GHL API ───────────────────────────────────────────────────────────────

function ghlRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': GHL_VERSION,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }
    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', chunk => responseData += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(responseData) }) }
        catch { resolve({ status: res.statusCode, body: responseData }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function sendEmail(contactId, email, firstName, score) {
  const template = getEmailTemplate(score, firstName)
  const result = await ghlRequest('POST', '/conversations/messages', {
    type: 'Email',
    contactId,
    subject: template.subject,
    html: template.html,
    fromName: 'Shannon Nicole',
    fromEmail: 'nicole@switchtoamerica.com',
    to: email,
  })
  if (result.status >= 200 && result.status < 300) {
    console.log(`Email sent to ${email} | Subject: ${template.subject}`)
  } else {
    console.warn(`Email send warning for ${email}:`, result.body)
  }
  return result
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────

async function handleQuizSubmission(submission) {
  const { firstName, lastName, email, phone, score, answers, source } = submission

  const stageId = score >= 15 ? STAGES.qualified : score >= 8 ? STAGES.nurture : STAGES.notFit
  const leadType = score >= 15 ? 'Qualified Builder' : score >= 8 ? 'Warm Nurture' : 'Not a Fit'
  const today = new Date().toISOString().split('T')[0]

  // 1. Create GHL contact
  const contactPayload = {
    locationId: GHL_LOCATION_ID,
    firstName,
    lastName: lastName || '',
    email,
    phone: phone || '',
    source: source || 'Builder Quiz',
    tags: ['builder-quiz', leadType.toLowerCase().replace(/ /g, '-')],
    customFields: [
      { id: QUIZ_SCORE_FIELD_ID, value: String(score) },
      { id: 'rm09OzPGv41K8bP1kQyR', value: leadType },
      { id: 'ZceUTpgbwTA9y70UE74Q', value: today },
      { id: '1rM7I1uXqMwrWm7mejnC', value: source || 'Quiz' },
    ]
  }

  const contactResult = await ghlRequest('POST', '/contacts/', contactPayload)
  const contactId = contactResult.body?.contact?.id

  if (!contactId) {
    console.error('Contact creation failed:', contactResult.body)
    return { success: false, error: 'Contact creation failed', details: contactResult.body }
  }
  console.log(`Contact: ${contactId} | ${email} | Score: ${score} | ${leadType}`)

  // 2. Create opportunity in Builder Recruitment pipeline
  const oppResult = await ghlRequest('POST', '/opportunities/', {
    pipelineId: PIPELINE_ID,
    locationId: GHL_LOCATION_ID,
    name: `${firstName} ${lastName || ''} — Builder Quiz (Score: ${score})`,
    pipelineStageId: stageId,
    contactId,
    status: 'open',
    source: source || 'Builder Quiz',
    customFields: [{ id: QUIZ_SCORE_FIELD_ID, value: String(score) }]
  })
  const oppId = oppResult.body?.opportunity?.id
  if (oppId) console.log(`Opportunity: ${oppId} | Stage: ${leadType}`)

  // 3. Send email immediately
  await sendEmail(contactId, email, firstName, score)

  return { success: true, contactId, opportunityId: oppId, score, leadType }
}

// ─── SERVER ────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

  if (req.method === 'POST' && req.url === '/quiz-submit') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const submission = JSON.parse(body)
        console.log(`Quiz submission: ${submission.email} | Score: ${submission.score}`)
        const result = await handleQuizSubmission(submission)
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (err) {
        console.error('Error:', err)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
      }
    })
    return
  }

  if (req.method === 'POST' && req.url === '/ab-track') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        console.log(`A/B Track: variant=${data.variant} | ${data.url}`)
      } catch {}
      res.writeHead(200); res.end('ok')
    })
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'builder-quiz-server', version: '2.0' }))
    return
  }

  res.writeHead(404); res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`Builder Quiz Server v2.0 on port ${PORT}`)
  if (!GHL_TOKEN) console.warn('WARNING: GHL_PIT_TOKEN not set')
})
