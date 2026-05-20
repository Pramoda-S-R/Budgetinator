import { authClient } from "#/auth";
import { useNavigate } from "@tanstack/react-router";
import { SignIn } from "./auth/sign-in";
import { SignUp } from "./auth/sign-up";

type AuthViewProps = {
  pathname: "sign-in" | "sign-out" | "sign-up";
  redirectTo?: string;
};

const AuthView = ({ pathname, redirectTo }: AuthViewProps) => {
  const navigate = useNavigate();
  switch (pathname) {
    case "sign-out":
      authClient.signOut().then(() => {
        navigate({ to: "/" });
      });
      break;
    case "sign-in":
      return <SignIn redirectTo={redirectTo} />;
    case "sign-up":
      return <SignUp redirectTo={redirectTo} />;
    default:
      return pathname satisfies never;
  }
};

export default AuthView;
