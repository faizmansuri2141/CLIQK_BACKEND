const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const LOGO_CID = "cliqklogo";

const getLogoAttachment = () => {
  try {
    const logoPath = path.join(__dirname, "..", "click_logo_black_1x.pdf__ios_icon___4__720.png");
    if (!fs.existsSync(logoPath)) return null;
    return {
      filename: "cliqk-logo.png",
      content: fs.readFileSync(logoPath),
      cid: LOGO_CID,
    };
  } catch (err) {
    console.warn("Logo image not found:", err.message);
    return null;
  }
};

const sendWelcomeEmail = async (user) => {
  try {
    const emailUser = (process.env.USER || "cliqk.social@gmail.com").trim();
    const emailPass = (process.env.PASS || "fibjriaqsgjfxlyb").trim();

    if (!emailPass) {
      console.error("❌ Welcome email failed: PASS not set in .env (use Gmail App Password)");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: (process.env.HOST || "smtp.gmail.com").trim(),
      service: process.env.SERVICE || "gmail",
      port: 587,
      secure: false,
      auth: {
        user: "cliqk.social@gmail.com",
        pass: "fibjriaqsgjfxlyb",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const logoAttachment = getLogoAttachment();
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to CLIQK</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" 
    style="background-color:#f4f4f4; padding:20px;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="
            background-color:#ffffff;
            border-radius:12px;
            padding:32px 24px;
            max-width:600px;
            width:100%;
            text-align:center;
            font-family:Arial, Helvetica, sans-serif;
          ">

          ${logoAttachment ? `<!-- Logo / Image -->
          <tr>
            <td style="padding-bottom:20px;">
              <img 
                src="cid:${LOGO_CID}"
                alt="CLIQK"
                width="120"
                style="
                  max-width:120px;
                  width:100%;
                  height:auto;
                  display:block;
                  margin:0 auto;
                "
              />
            </td>
          </tr>` : ""}

          <!-- Welcome Text -->
          <tr>
            <td>
              <h2 style="margin:0 0 16px; color:#000;">
                Hey ${user.username || "there"} 👋
              </h2>

              <p style="font-size:15px; line-height:1.6; color:#333; margin:0 0 14px;">
                Welcome to <strong>CLIQK</strong>! Thanks for signing up.
              </p>

              <p style="font-size:15px; line-height:1.6; color:#333; margin:0 0 14px;">
                Group chats are where the best conversations happen. CLIQK is built to help you
                connect, grow your section, and explore real conversations.
              </p>

              <p style="font-size:15px; line-height:1.6; color:#333; margin:0 0 14px;">
                We’re still early, and your feedback truly matters. If something feels off or you
                have ideas, just let us know.
              </p>

              <p style="font-size:15px; line-height:1.6; color:#333; margin:0;">
                We’re excited to have you on this journey 🚀
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 0;">
              <hr style="border:none; border-top:1px solid #e5e5e5;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <p style="font-size:14px; color:#555; margin:0 0 20px;">
                Need help? Just reply to this email or reach us at<br/>
                <a href="mailto:kennethyao@cliqkworld.com" style="color:#000;">
                  kennethyao@cliqkworld.com
                </a>
              </p>

              <p style="margin:0; font-size:14px; color:#333;">
                <strong>Kenneth Yao</strong><br/>
                <span style="font-size:13px; color:#777;">Founder, CLIQK</span>
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Container -->

      </td>
    </tr>
  </table>
</body>
</html>
`;


    await transporter.sendMail({
      from: `CLIQK <${emailUser}>`,
      to: user.email,
      subject: "Welcome to CLIQK 🤝",
      html: htmlTemplate,
      attachments: logoAttachment ? [logoAttachment] : [],
    });

    console.log("✅ Welcome email sent");
  } catch (error) {
    console.error("❌ Welcome email failed:", error);
  }
};


module.exports = sendWelcomeEmail;
