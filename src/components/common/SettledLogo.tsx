import Image from "next/image";

interface SettledLogoProps {
  alt?: string;
  className?: string;
  height?: number;
  priority?: boolean;
  width?: number;
}

export default function SettledLogo({
  alt = "Settled Property Solved",
  className,
  height = 64,
  priority = false,
  width = 170,
}: SettledLogoProps) {
  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      priority={priority}
      src="/assets/images/logo/settled-logo.png"
      width={width}
    />
  );
}
