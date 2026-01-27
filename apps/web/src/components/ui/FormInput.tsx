'use client';

import * as React from 'react';
import { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './Form';
import { Input } from './Input';
import { cn } from '@/lib/utils';

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'form'> {
  form: UseFormReturn<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
}

/**
 * react-hook-form과 통합된 Input 컴포넌트
 *
 * @example
 * ```tsx
 * const form = useForm<FormData>({
 *   resolver: zodResolver(schema),
 * });
 *
 * <FormInput
 *   form={form}
 *   name="email"
 *   label="이메일"
 *   type="email"
 *   placeholder="email@example.com"
 * />
 * ```
 */
export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  form,
  name,
  label,
  description,
  className,
  ...props
}: FormInputProps<TFieldValues, TName>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input className={cn(className)} {...field} {...props} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
