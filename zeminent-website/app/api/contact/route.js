import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const body = await req.json();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
   const mailOptions = {
  from: body.email,
  to: process.env.EMAIL_TO_USER,
  subject: `New Contact Message from ${body.fullName}`,
  html: `
    <div style="
      width: 100%;
      background: #f5f5f5;
      padding: 20px 0;
      font-family: Arial, sans-serif;
    ">
      <div style="
        max-width: 600px;
        margin: auto;
        background: #ffffff;
        border-radius: 10px;
        padding: 25px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      ">

        <h2 style="color: #333; margin-bottom: 10px;">
          New Contact Form Submission
        </h2>

        <p style="color:#555; margin-top: 0;">
          A new message has been submitted on your website.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

        <table style="width: 100%; font-size: 15px; color: #333; line-height: 1.6;">
          <tr>
            <td><strong>Name:</strong></td>
            <td>${body.fullName}</td>
          </tr>
          <tr>
            <td><strong>Email:</strong></td>
            <td>${body.email}</td>
          </tr>
          <tr>
            <td><strong>Phone:</strong></td>
            <td>${body.phone || "Not Provided"}</td>
          </tr>
          <tr>
            <td><strong>Company:</strong></td>
            <td>${body.company || "Not Provided"}</td>
          </tr>
          <tr>
            <td><strong>Service:</strong></td>
            <td>${body.service}</td>
          </tr>
          <tr>
            <td><strong>Budget:</strong></td>
            <td>${body.budget}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

        <h3 style="color: #333; margin-bottom: 10px;">Message</h3>
        <p style="color:#444; white-space: pre-wrap; background:#fafafa; padding:15px; border-radius:8px; border:1px solid #eee;">
          ${body.details}
        </p>

        <p style="margin-top: 30px; color:#999; font-size: 13px;">
          — This email was automatically generated from the Zeminent contact form.
        </p>
      </div>
    </div>
  `,
};


    await transporter.sendMail(mailOptions);

    return Response.json({ success: true });
  } catch (error) {
    console.error("EMAIL ERROR →", error);
    return Response.json(
      { success: false, message: "Email sending failed" },
      { status: 500 }
    );
  }
}
