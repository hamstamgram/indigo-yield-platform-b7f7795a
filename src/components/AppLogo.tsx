
import { Link } from "react-router-dom";

type AppLogoProps = {
  className?: string;
  showText?: boolean;
  linkTo?: string;
};

const AppLogo = ({ className = "h-8 w-auto", showText = false, linkTo }: AppLogoProps) => {
  const LogoContent = () => (
    <>
      <img 
        src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png" 
        alt="Indigo Digital Assets Yield" 
        className={className} 
      />
      {/* Text has been removed as requested */}
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
