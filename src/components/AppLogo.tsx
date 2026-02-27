import { Link } from "react-router-dom";

type AppLogoProps = {
  className?: string;
  showText?: boolean;
  linkTo?: string;
};

const AppLogo = ({ className = "h-8 w-auto", linkTo }: AppLogoProps) => {
  const LogoContent = () => (
    <>
      <img
        src="/brand/logo-white.svg"
        alt="Indigo Digital Assets Yield"
        className={className}
        loading="lazy"
        decoding="async"
      />
    </>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-center">
        <LogoContent />
      </Link>
    );
  }

  return (
    <div className="flex items-center">
      <LogoContent />
    </div>
  );
};

export default AppLogo;
