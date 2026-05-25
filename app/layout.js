import "./globals.css";

export const metadata = {
  title: "CekDulu - Cek Hoax & Link Mencurigakan",
  description:
    "CekDulu membantu mengecek tanda-tanda pesan, berita, chat WhatsApp, atau link yang mencurigakan sebelum disebarkan.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
