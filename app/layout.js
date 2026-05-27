import { Lexend, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "CekDulu - Cek Hoax & Link Mencurigakan",
  description:
    "CekDulu membantu mengecek tanda-tanda pesan, berita, chat WhatsApp, atau link yang mencurigakan sebelum disebarkan.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body className="bg-[#EEF2F7] text-[#0F172A] font-source antialiased selection:bg-blue-200">
        {children}
      </body>
    </html>
  );
}
