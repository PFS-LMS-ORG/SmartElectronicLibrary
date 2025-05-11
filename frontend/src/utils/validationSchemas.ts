// src/utils/validationSchemas.ts

import { z } from 'zod';

/**
 * Schema for login form validation
 */
export const loginSchema = z.object({
    email: z.string()
        .min(1, { message: "Email is required" })
        .email({ message: "Invalid email format" }),
    password: z.string()
        .min(1, { message: "Password is required" }),
});

/**
 * Schema for registration form validation
 */
export const registrationSchema = z.object({
    fullName: z.string()
        .min(1, { message: "Full name is required" })
        .refine(name => /^[a-zA-Z\s]+$/.test(name), {
        message: "Name can only contain letters and spaces"
        }),
    email: z.string()
        .min(1, { message: "Email is required" })
        .email({ message: "Invalid email format" }),
    password: z.string()
        .min(6, { message: "Password must be at least 6 characters" })
        .refine(password => /[A-Z]/.test(password), {
        message: "Password must contain at least one uppercase letter"
        })
        .refine(password => /[0-9]/.test(password), {
        message: "Password must contain at least one number"
        }),
    confirmPassword: z.string()
        .min(1, { message: "Please confirm your password" }),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

/**
 * Type for login form data
 */
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Type for registration form data
 */
export type RegistrationFormData = z.infer<typeof registrationSchema>;

/**
 * Common form error interface
 */
export interface FormErrors {
    [key: string]: string | undefined;
}

/**
 * Password validation requirements for user feedback
 */
export const passwordRequirements = [
    { id: 'length', description: 'At least 6 characters', regex: /.{6,}/ },
    { id: 'uppercase', description: 'At least one uppercase letter', regex: /[A-Z]/ },
    { id: 'number', description: 'At least one number', regex: /[0-9]/ }
];

/**
 * Utility function to validate form data against a schema
 */
export function validateWithZod<T>(
    schema: z.ZodType<T>, 
    data: T, 
    callback: (errors: FormErrors) => void
): boolean {
    try {
        schema.parse(data);
        callback({});
        return true;
    } catch (error) {
        if (error instanceof z.ZodError) {
        const formattedErrors: FormErrors = {};
        
        error.errors.forEach((err) => {
            const path = err.path[0].toString();
            formattedErrors[path] = err.message;
        });
        
        callback(formattedErrors);
        }
        return false;
    }
}