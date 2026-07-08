import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Streams a payment receipt PDF from the backend through the BFF. The
// upstream returns binary; we forward the body unparsed and preserve the
// Content-Type + Content-Disposition headers so the browser opens the PDF
// inline (or downloads it via <a download>). Non-2xx upstream → JSON
// error envelope back to the caller.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ paymentId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }

  const { paymentId } = await ctx.params;
  const upstream = await nestFetch(
    `/payments/receipt/${encodeURIComponent(paymentId)}`,
    { method: "GET", bearer: session.rt },
  );

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") || "application/pdf",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ||
        `inline; filename="receipt.pdf"`,
    },
  });
}
