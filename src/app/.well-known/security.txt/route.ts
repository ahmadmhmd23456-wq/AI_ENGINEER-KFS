import { NextResponse } from "next/server";

export async function GET() {
  const securityPolicy = [
    "# Engineering Academy Security Policy",
    "# Compliant with RFC 9116",
    "Contact: mailto:security@eng-academy.edu.eg",
    "Expires: 2027-12-31T23:59:59.000Z",
    "Preferred-Languages: ar, en",
    "Canonical: https://percent-freedom-fold-existed.trycloudflare.com/.well-known/security.txt",
    "Policy: https://percent-freedom-fold-existed.trycloudflare.com/security",
    "Acknowledgments: https://percent-freedom-fold-existed.trycloudflare.com/hall-of-fame",
    "",
    "# We take the security of our students and educational data seriously.",
    "# If you discover a vulnerability, please report it responsibly.",
  ].join("\n");

  return new NextResponse(securityPolicy, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
