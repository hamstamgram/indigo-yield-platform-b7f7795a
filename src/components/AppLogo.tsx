
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
        src="/lovable-uploads/2d55a454-e894-4533-85b1-b372e83be397.png" 
        alt="Company Logo" 
        className={className} 
      />
      {showText && (
        <span className="ml-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
          Indigo Yield Fund
        </span>
      )}
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
