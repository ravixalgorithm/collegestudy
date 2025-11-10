"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FormField = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("space-y-2", className)} {...props} />,
);
FormField.displayName = "FormField";

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  >
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
));
FormLabel.displayName = "FormLabel";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-gray-600", className)} {...props} />,
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    type?: "error" | "success" | "warning" | "info";
  }
>(({ className, type = "error", children, ...props }, ref) => {
  if (!children) return null;

  const typeStyles = {
    error: "text-red-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
  };

  return (
    <p ref={ref} className={cn("text-sm", typeStyles[type], className)} {...props}>
      {children}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

const FormGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    cols?: 1 | 2 | 3 | 4;
  }
>(({ className, cols = 2, ...props }, ref) => {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return <div ref={ref} className={cn("grid gap-4", colsClass[cols], className)} {...props} />;
});
FormGrid.displayName = "FormGrid";

const FormActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 pt-6 border-t",
        className,
      )}
      {...props}
    />
  ),
);
FormActions.displayName = "FormActions";

const FormSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    description?: string;
  }
>(({ className, title, description, children, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props}>
    {title && (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
    )}
    {children}
  </div>
));
FormSection.displayName = "FormSection";

const FormFieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    label?: string;
    description?: string;
    required?: boolean;
    error?: string;
  }
>(({ className, label, description, required, error, children, ...props }, ref) => (
  <FormField ref={ref} className={className} {...props}>
    {label && <FormLabel required={required}>{label}</FormLabel>}
    {description && <FormDescription>{description}</FormDescription>}
    {children}
    {error && <FormMessage type="error">{error}</FormMessage>}
  </FormField>
));
FormFieldGroup.displayName = "FormFieldGroup";

export { FormField, FormLabel, FormDescription, FormMessage, FormGrid, FormActions, FormSection, FormFieldGroup };
