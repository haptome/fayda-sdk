import { useContext } from "react";
import { FaydaContext, FaydaContextValue } from "../FaydaProvider.js";

export function useFayda(): FaydaContextValue {
  const context = useContext(FaydaContext);
  if (!context) {
    throw new Error("useFayda must be used within FaydaProvider");
  }
  return context;
}
