import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Phone, MapPin, Globe, Award } from "lucide-react";

interface CardData {
  fullName: string;
  title: string | null;
  department: string | null;
  facultyId: string | null;
  avatarUrl: string | null;
  issueDate: string;
  status: string;
  verificationToken: string;
}

interface Props {
  data: CardData;
  flipped: boolean;
}

export const ProfessorIDCard = ({ data, flipped }: Props) => {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    const payload = JSON.stringify({
      fid: data.facultyId,
      n: data.fullName,
      r: "professor",
      a: data.status === "active",
      t: data.verificationToken,
      v: 1,
    });
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    }).then(setQrUrl);
  }, [data.facultyId, data.fullName, data.status, data.verificationToken]);

  const initials = (data.fullName || "P").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const isActive = data.status === "active";

  // Premium faculty palette: deep charcoal + gold
  const charcoal = "hsl(220, 20%, 10%)";
  const gold = "hsl(42, 75%, 55%)";

  return (
    <div className="card-flip-wrapper" style={{ perspective: "1500px" }}>
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          aspectRatio: "1.586 / 1",
        }}
      >
        {/* FRONT — Premium dark with gold trim */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div
            className="relative h-full w-full text-white"
            style={{
              background: `radial-gradient(at 100% 0%, hsl(220, 20%, 18%) 0%, ${charcoal} 60%)`,
            }}
          >
            {/* Subtle pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, white 0px, white 1px, transparent 1px, transparent 8px)",
              }}
            />

            {/* Gold border */}
            <div
              className="absolute inset-2 rounded-xl pointer-events-none"
              style={{ border: `1px solid ${gold}`, opacity: 0.4 }}
            />

            {/* Top bar */}
            <div className="relative flex items-center justify-between px-5 pt-4">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-md"
                  style={{ backgroundColor: gold }}
                >
                  <GraduationCap className="h-5 w-5 text-black" />
                </div>
                <div className="leading-tight">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-80">Western Balkans</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: gold }}>
                    University · Faculty
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ border: `1px solid ${gold}` }}>
                <Award className="h-3 w-3" style={{ color: gold }} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: gold }}>
                  Faculty
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="relative flex h-[calc(100%-60px)] gap-3 px-5 pt-3 pb-4">
              {/* Left: photo */}
              <div className="flex w-[32%] flex-col items-center justify-start gap-2">
                <div className="rounded-lg p-[2px]" style={{ background: `linear-gradient(135deg, ${gold}, hsl(42, 60%, 35%))` }}>
                  <Avatar className="h-[88px] w-[88px] rounded-lg shadow-lg">
                    {data.avatarUrl && <AvatarImage src={data.avatarUrl} alt={data.fullName} className="object-cover" />}
                    <AvatarFallback className="rounded-lg bg-zinc-800 text-2xl font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {!isActive && (
                  <Badge variant="destructive" className="text-[9px] uppercase">
                    {data.status}
                  </Badge>
                )}
              </div>

              {/* Center info */}
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: gold }}>
                    Professor
                  </p>
                  <p className="truncate font-display text-base font-bold leading-tight">
                    {data.fullName}
                  </p>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">Title</p>
                  <p className="truncate text-xs font-medium">{data.title || "—"}</p>
                  <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">Department</p>
                  <p className="line-clamp-2 text-xs font-medium opacity-95">{data.department || "—"}</p>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">Faculty ID</p>
                    <p className="truncate font-mono text-[11px] font-bold" style={{ color: gold }}>
                      {data.facultyId || "—"}
                    </p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">Issued</p>
                    <p className="text-[10px] font-medium">
                      {new Date(data.issueDate).toLocaleDateString("en-GB")}
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="rounded-md bg-white p-1 shadow-md">
                      {qrUrl && <img src={qrUrl} alt="Faculty verification QR" className="h-[68px] w-[68px]" />}
                    </div>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-wider" style={{ color: gold }}>
                      Faculty Pass
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div
            className="relative h-full w-full text-white"
            style={{
              background: `radial-gradient(at 0% 100%, hsl(220, 20%, 18%) 0%, ${charcoal} 60%)`,
            }}
          >
            <div
              className="absolute inset-2 rounded-xl pointer-events-none"
              style={{ border: `1px solid ${gold}`, opacity: 0.4 }}
            />

            <div className="relative flex h-[20%] items-center justify-between border-b border-white/15 px-5">
              <p className="font-display text-xs font-bold uppercase tracking-[0.25em]" style={{ color: gold }}>
                Faculty Card · Info
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: gold }}>
                <GraduationCap className="h-4 w-4 text-black" />
              </div>
            </div>

            <div className="relative flex h-[80%] flex-col gap-2 p-4 text-[10px] leading-relaxed">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: gold }}>
                  Faculty Privileges
                </p>
                <ul className="space-y-0.5 text-[10px] text-white/85">
                  <li>• Full campus & faculty office access</li>
                  <li>• Library staff borrowing privileges</li>
                  <li>• Authorized to verify student attendance</li>
                  <li>• Non-transferable — present on official request</li>
                </ul>
              </div>

              <div className="mt-auto space-y-1 border-t border-white/15 pt-2">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" style={{ color: gold }} />
                  <p className="text-[10px]">Rr. Universiteti, Tetovo, North Macedonia</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0" style={{ color: gold }} />
                  <p className="text-[10px]">+389 44 123 456</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3 shrink-0" style={{ color: gold }} />
                  <p className="text-[10px]">wbu.lovable.app</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
