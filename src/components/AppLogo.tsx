
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
        src="/lovable-uploads/fca55247-2fe5-4db1-a35b-635a50f38a38.png" 
        alt="Indigo Yield Fund Logo" 
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
