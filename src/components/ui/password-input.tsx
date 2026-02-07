import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";

export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [capsLockOn, setCapsLockOn] = React.useState(false);

    const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.getModifierState) {
        setCapsLockOn(e.getModifierState("CapsLock"));
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setCapsLockOn(false);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-20 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          onBlur={handleBlur}
          {...props}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {capsLockOn && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Bloq Mayús activado</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">
              {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            </span>
          </Button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
