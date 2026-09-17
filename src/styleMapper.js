const colorMap = {
  'rgb(255, 255, 255)': 'white',
  'rgba(255, 255, 255, 1)': 'white',
  'rgb(0, 0, 0)': 'black',
  'rgba(0, 0, 0, 1)': 'black',
  'rgba(0, 0, 0, 0)': 'transparent',
  'transparent': 'transparent'
};

const fontSizeMap = {
  '12px': 'text-xs',
  '14px': 'text-sm',
  '16px': 'text-base',
  '18px': 'text-lg',
  '20px': 'text-xl',
  '24px': 'text-2xl',
  '30px': 'text-3xl',
  '36px': 'text-4xl',
  '48px': 'text-5xl'
};

const fontWeightMap = {
  '100': 'font-thin',
  '200': 'font-extralight',
  '300': 'font-light',
  '400': 'font-normal',
  '500': 'font-medium',
  '600': 'font-semibold',
  '700': 'font-bold',
  '800': 'font-extrabold',
  '900': 'font-black'
};

const radiusMap = {
  '0px': 'rounded-none',
  '2px': 'rounded-sm',
  '4px': 'rounded',
  '6px': 'rounded-md',
  '8px': 'rounded-lg',
  '12px': 'rounded-xl',
  '16px': 'rounded-2xl',
  '24px': 'rounded-3xl',
  '9999px': 'rounded-full',
  '50%': 'rounded-full'
};

const spacingScale = {
  '0px': '0',
  '2px': '0.5',
  '4px': '1',
  '6px': '1.5',
  '8px': '2',
  '10px': '2.5',
  '12px': '3',
  '14px': '3.5',
  '16px': '4',
  '20px': '5',
  '24px': '6',
  '28px': '7',
  '32px': '8',
  '36px': '9',
  '40px': '10',
  '48px': '12',
  '64px': '16'
};

const justifyMap = {
  'flex-start': 'justify-start',
  'start': 'justify-start',
  'center': 'justify-center',
  'flex-end': 'justify-end',
  'end': 'justify-end',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
  'space-evenly': 'justify-evenly'
};

const alignMap = {
  'flex-start': 'items-start',
  'start': 'items-start',
  'center': 'items-center',
  'flex-end': 'items-end',
  'end': 'items-end',
  'baseline': 'items-baseline',
  'stretch': 'items-stretch'
};

function parseRgb(colorStr) {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return colorStr;
  const [, r, g, b, a] = match;
  if (a !== undefined && parseFloat(a) === 0) return 'transparent';
  const toHex = (n) => parseInt(n, 10).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function arbitrary(property, value) {
  if (!value) return null;
  return `${property}-[${value.replaceAll(' ', '_')}]`;
}

export function computedStyleToTailwind(style) {
  if (!style) return '';
  const classes = [];

  // Display & Position
  if (style.display === 'flex') classes.push('flex');
  else if (style.display === 'grid') classes.push('grid');
  else if (style.display === 'inline-flex') classes.push('inline-flex');
  else if (style.display === 'inline-block') classes.push('inline-block');
  else if (style.display === 'none') classes.push('hidden');

  if (style.position && style.position !== 'static') {
    classes.push(style.position);
  }

  // Flex Direction & Alignment
  if (style.display === 'flex' || style.display === 'inline-flex') {
    if (style.flexDirection === 'column') classes.push('flex-col');
    if (style.flexDirection === 'row-reverse') classes.push('flex-row-reverse');
    if (style.justifyContent && justifyMap[style.justifyContent]) {
      classes.push(justifyMap[style.justifyContent]);
    }
    if (style.alignItems && alignMap[style.alignItems]) {
      classes.push(alignMap[style.alignItems]);
    }
  }

  // Gap
  if (style.gap && style.gap !== 'normal') {
    classes.push(spacingScale[style.gap] ? `gap-${spacingScale[style.gap]}` : arbitrary('gap', style.gap));
  }

  // Background
  if (style.backgroundColor) {
    if (colorMap[style.backgroundColor]) {
      classes.push(`bg-${colorMap[style.backgroundColor]}`);
    } else {
      const hex = parseRgb(style.backgroundColor);
      classes.push(arbitrary('bg', hex));
    }
  }

  // Text Color
  if (style.color) {
    if (colorMap[style.color]) {
      classes.push(`text-${colorMap[style.color]}`);
    } else {
      const hex = parseRgb(style.color);
      classes.push(arbitrary('text', hex));
    }
  }

  // Typography
  if (style.fontSize) {
    classes.push(fontSizeMap[style.fontSize] || arbitrary('text', style.fontSize));
  }
  if (style.fontWeight && fontWeightMap[style.fontWeight]) {
    classes.push(fontWeightMap[style.fontWeight]);
  }

  // Radius
  if (style.borderRadius && style.borderRadius !== '0px') {
    classes.push(radiusMap[style.borderRadius] || arbitrary('rounded', style.borderRadius));
  }

  // Padding
  if (style.padding && style.padding !== '0px') {
    classes.push(spacingScale[style.padding] ? `p-${spacingScale[style.padding]}` : arbitrary('p', style.padding));
  }

  // Border & Shadow
  if (style.border && style.border !== 'none' && !style.border.startsWith('0px')) {
    classes.push('border');
  }
  if (style.boxShadow && style.boxShadow !== 'none') {
    classes.push('shadow-md');
  }

  return classes.filter(Boolean).join(' ');
}

export function styleRows(style) {
  if (!style) return [];
  return [
    ['Background', style.backgroundColor],
    ['Text color', style.color],
    ['Font', `${style.fontFamily || ''} / ${style.fontSize || ''}`.trim()],
    ['Weight', style.fontWeight],
    ['Spacing', `padding ${style.padding || '0px'} / margin ${style.margin || '0px'}`],
    ['Border', style.border],
    ['Radius', style.borderRadius],
    ['Shadow', style.boxShadow],
    ['Layout', `${style.display || ''}${style.gap && style.gap !== 'normal' ? ` / gap ${style.gap}` : ''}`]
  ].filter(([, value]) => value && value !== 'none');
}

export function elementToJsx(element, style, depth = 0) {
  if (!element) return '';
  const tag = element?.tagName?.toLowerCase() || 'div';
  const nodeStyle = element?.style || style;
  const className = computedStyleToTailwind(nodeStyle);

  let attrString = className ? ` className="${className}"` : '';
  if (element?.attributes) {
    if (element.attributes.href) attrString += ` href="${element.attributes.href}"`;
    if (element.attributes.src) attrString += ` src="${element.attributes.src}"`;
    if (element.attributes.alt) attrString += ` alt="${element.attributes.alt}"`;
    if (element.attributes.type) attrString += ` type="${element.attributes.type}"`;
    if (element.attributes.placeholder) attrString += ` placeholder="${element.attributes.placeholder}"`;
    if (element.attributes['aria-label']) attrString += ` aria-label="${element.attributes['aria-label']}"`;
    if (element.attributes.role) attrString += ` role="${element.attributes.role}"`;
  }

  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  if (element?.children && element.children.length > 0) {
    const renderedChildren = element.children
      .map((child) => elementToJsx(child, child.style, depth + 1))
      .join('\n');
    const directText = element.text ? `${childIndent}<span>${element.text}</span>\n` : '';
    return `${indent}<${tag}${attrString}>\n${directText}${renderedChildren}\n${indent}</${tag}>`;
  }

  if (['img', 'input', 'hr', 'br'].includes(tag)) {
    return `${indent}<${tag}${attrString} />`;
  }

  if (element?.text) {
    return `${indent}<${tag}${attrString}>${element.text}</${tag}>`;
  }

  return `${indent}<${tag}${attrString}></${tag}>`;
}

export function computedStyleToCssRules(style) {
  if (!style) return [];
  const rules = [];

  // Layout & Display
  if (style.display && style.display !== 'inline') rules.push(`display: ${style.display};`);
  if (style.position && style.position !== 'static') rules.push(`position: ${style.position};`);
  if (
    style.flexDirection &&
    (style.display === 'flex' || style.display === 'inline-flex') &&
    style.flexDirection !== 'row'
  ) {
    rules.push(`flex-direction: ${style.flexDirection};`);
  }
  if (
    style.justifyContent &&
    (style.display === 'flex' || style.display === 'inline-flex') &&
    style.justifyContent !== 'normal' &&
    style.justifyContent !== 'start'
  ) {
    rules.push(`justify-content: ${style.justifyContent};`);
  }
  if (
    style.alignItems &&
    (style.display === 'flex' || style.display === 'inline-flex') &&
    style.alignItems !== 'normal'
  ) {
    rules.push(`align-items: ${style.alignItems};`);
  }
  if (style.gap && style.gap !== 'normal' && style.gap !== '0px') {
    rules.push(`gap: ${style.gap};`);
  }

  // Box Sizing & Spacing
  if (style.padding && style.padding !== '0px') rules.push(`padding: ${style.padding};`);
  if (style.margin && style.margin !== '0px') rules.push(`margin: ${style.margin};`);

  // Background & Colors
  if (
    style.backgroundColor &&
    style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
    style.backgroundColor !== 'transparent'
  ) {
    rules.push(`background-color: ${style.backgroundColor};`);
  }
  if (style.color) rules.push(`color: ${style.color};`);

  // Typography
  if (style.fontFamily) rules.push(`font-family: ${style.fontFamily};`);
  if (style.fontSize) rules.push(`font-size: ${style.fontSize};`);
  if (style.fontWeight && style.fontWeight !== '400' && style.fontWeight !== 'normal') {
    rules.push(`font-weight: ${style.fontWeight};`);
  }
  if (style.lineHeight && style.lineHeight !== 'normal') {
    rules.push(`line-height: ${style.lineHeight};`);
  }
  if (style.letterSpacing && style.letterSpacing !== 'normal') {
    rules.push(`letter-spacing: ${style.letterSpacing};`);
  }

  // Borders, Radius & Shadow
  if (style.border && style.border !== 'none' && !style.border.startsWith('0px')) {
    rules.push(`border: ${style.border};`);
  }
  if (style.borderRadius && style.borderRadius !== '0px') {
    rules.push(`border-radius: ${style.borderRadius};`);
  }
  if (style.boxShadow && style.boxShadow !== 'none') {
    rules.push(`box-shadow: ${style.boxShadow};`);
  }

  return rules;
}

export function generatePureCss(selection) {
  if (!selection) return '';
  const rootTag = selection.tagName?.toLowerCase() || 'div';
  const rawClass = selection.attributes?.class || selection.attributes?.className || '';
  const rootClass = rawClass
    ? rawClass.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  const rootSelector = rootClass ? `.${rootClass}` : `.${rootTag}-component`;

  const blocks = [];

  // Root block
  const rootRules = computedStyleToCssRules(selection.style);
  if (rootRules.length > 0) {
    blocks.push(`${rootSelector} {\n  ${rootRules.join('\n  ')}\n}`);
  } else {
    blocks.push(`${rootSelector} {\n  /* Varsayılan tarayıcı stilleri / Default browser styles */\n}`);
  }

  // Recursive child elements processing (up to 2 levels)
  const processChildren = (children, parentSelector, depth = 1) => {
    if (!children || children.length === 0 || depth > 2) return;
    children.forEach((child, index) => {
      const tag = child.tagName?.toLowerCase() || 'div';
      const rawChildClass = child.attributes?.class || child.attributes?.className || '';
      const childClass = rawChildClass
        ? rawChildClass.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9_-]/g, '')
        : '';
      const childSelector = childClass
        ? `${parentSelector} .${childClass}`
        : `${parentSelector} > ${tag}:nth-child(${index + 1})`;

      const childRules = computedStyleToCssRules(child.style);
      if (childRules.length > 0) {
        blocks.push(`${childSelector} {\n  ${childRules.join('\n  ')}\n}`);
      }

      if (child.children && child.children.length > 0) {
        processChildren(child.children, childSelector, depth + 1);
      }
    });
  };

  if (selection.children && selection.children.length > 0) {
    processChildren(selection.children, rootSelector, 1);
  }

  return blocks.join('\n\n');
}

