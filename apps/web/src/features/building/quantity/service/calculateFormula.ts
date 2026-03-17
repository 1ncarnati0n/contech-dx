/**
 * Safe mathematical expression evaluator (=formula).
 * Only allows digits, +, -, *, /, parentheses, dots, and spaces.
 */

type OperatorToken = '+' | '-' | '*' | '/' | 'u-';
type Token = string;

function tokenizeExpression(expression: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  let depth = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (char === '(') {
      depth += 1;
      if (depth > 30) return null;
      tokens.push(char);
      i += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth < 0) return null;
      tokens.push(char);
      i += 1;
      continue;
    }

    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push(char);
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let numeric = '';
      let dots = 0;

      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        if (expression[i] === '.') {
          dots += 1;
          if (dots > 1) return null;
        }
        numeric += expression[i];
        i += 1;
      }

      if (numeric === '.') return null;
      tokens.push(numeric);
      continue;
    }

    return null;
  }

  return depth === 0 ? tokens : null;
}

function precedence(operator: OperatorToken): number {
  switch (operator) {
    case 'u-':
      return 3;
    case '*':
    case '/':
      return 2;
    case '+':
    case '-':
      return 1;
  }
}

function isRightAssociative(operator: OperatorToken): boolean {
  return operator === 'u-';
}

function toReversePolishNotation(tokens: Token[]): Token[] | null {
  const output: Token[] = [];
  const operators: Token[] = [];

  type PreviousToken = 'start' | 'number' | 'operator' | 'leftParen' | 'rightParen';
  let previousToken: PreviousToken = 'start';

  for (const token of tokens) {
    if (/^\d*\.?\d+$/.test(token)) {
      output.push(token);
      previousToken = 'number';
      continue;
    }

    if (token === '(') {
      operators.push(token);
      previousToken = 'leftParen';
      continue;
    }

    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop() as Token);
      }
      if (operators.length === 0) return null;
      operators.pop(); // pop '('
      previousToken = 'rightParen';
      continue;
    }

    if (['+', '-', '*', '/'].includes(token)) {
      let currentOperator = token as OperatorToken;
      if (
        currentOperator === '-' &&
        (previousToken === 'start' || previousToken === 'operator' || previousToken === 'leftParen')
      ) {
        currentOperator = 'u-';
      } else if (
        previousToken === 'start' ||
        previousToken === 'operator' ||
        previousToken === 'leftParen'
      ) {
        return null;
      }

      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (!['+', '-', '*', '/', 'u-'].includes(top)) break;

        const topOperator = top as OperatorToken;
        const shouldPop = isRightAssociative(currentOperator)
          ? precedence(currentOperator) < precedence(topOperator)
          : precedence(currentOperator) <= precedence(topOperator);

        if (!shouldPop) break;
        output.push(operators.pop() as Token);
      }

      operators.push(currentOperator);
      previousToken = 'operator';
      continue;
    }

    return null;
  }

  if (previousToken === 'operator' || previousToken === 'leftParen') {
    return null;
  }

  while (operators.length > 0) {
    const operator = operators.pop() as Token;
    if (operator === '(' || operator === ')') return null;
    output.push(operator);
  }

  return output;
}

function evaluateRpn(tokens: Token[]): number | null {
  const stack: number[] = [];

  for (const token of tokens) {
    if (/^\d*\.?\d+$/.test(token)) {
      stack.push(Number(token));
      continue;
    }

    if (token === 'u-') {
      if (stack.length < 1) return null;
      const value = stack.pop() as number;
      stack.push(-value);
      continue;
    }

    if (['+', '-', '*', '/'].includes(token)) {
      if (stack.length < 2) return null;
      const b = stack.pop() as number;
      const a = stack.pop() as number;

      let result: number;
      switch (token) {
        case '+':
          result = a + b;
          break;
        case '-':
          result = a - b;
          break;
        case '*':
          result = a * b;
          break;
        case '/':
          if (b === 0) return null;
          result = a / b;
          break;
        default:
          return null;
      }

      if (!isFinite(result) || isNaN(result)) return null;
      stack.push(result);
      continue;
    }

    return null;
  }

  return stack.length === 1 ? stack[0] : null;
}

export function calculateFormula(formula: string): number | null {
  try {
    let expression = formula.trim();
    if (expression.startsWith('=')) {
      expression = expression.substring(1).trim();
    }

    if (!expression) return null;
    if (expression.length > 200) return null;
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) return null;

    const tokens = tokenizeExpression(expression);
    if (!tokens || tokens.length === 0) return null;

    const rpn = toReversePolishNotation(tokens);
    if (!rpn) return null;
    const result = evaluateRpn(rpn);
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
