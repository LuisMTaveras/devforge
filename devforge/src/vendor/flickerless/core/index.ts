// Sin el Web Component: `element.ts` extiende HTMLElement al importarse y
// rompía React Native, Node y los tests. Quien lo quiera: '@flickerless/core/element'.
export * from './types';
export * from './controller';
