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
import { Textarea } from './Input';
import { cn } from '@/lib/utils';

interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'name' | 'form'
  > {
  form: UseFormReturn<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
}

/**
 * react-hook-form과 통합된 Textarea 컴포넌트
 *
 * @example
 * ```tsx
 * const form = useForm<FormData>({
 *   resolver: zodResolver(schema),
 * });
 *
 * <FormTextarea
 *   form={form}
 *   name="content"
 *   label="내용"
 *   placeholder="내용을 입력하세요..."
 *   rows={5}
 * />
 * ```
 */
export function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  form,
  name,
  label,
  description,
  className,
  ...props
}: FormTextareaProps<TFieldValues, TName>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Textarea className={cn(className)} {...field} {...props} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
