import { createContext, useContext } from 'react';

/** Si la superficie que envuelve a un componente ya tiene una respuesta. `null`: no hay superficie. */
export const SettledContext = createContext<boolean | null>(null);

export const useSettled = () => useContext(SettledContext);
