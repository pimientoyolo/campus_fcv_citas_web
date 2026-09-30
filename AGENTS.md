# Agente de citas-web

## Implementación detectada
React 19, Vite 7, TypeScript y CSS. Node 24. Frontend inicial creado localmente: no afirmar que fue exportado de Stitch/AI Studio ni que tiene aprobación visual.

## Organización
- `src/main.tsx`: formularios login/registro, sesión y estados de UI.
- `src/api.ts`: cliente REST tipado, timeout y errores.
- `src/styles.css`: diseño adaptable.
- API configurable con `VITE_API_URL`; no Express/BFF.

## Reglas y Responsabilidades
- **Dominio exclusivo de UI**: Implementar únicamente el frontend. No implementar reglas de negocio solo en el cliente (el backend es la autoridad).
- **Fidelidad**: Mantener alta fidelidad al diseño aprobado. Preservar componentes/estilos correctos al reconciliar con AI Studio.
- Conservar etiquetas, foco visible, mensajes de error y controles deshabilitados (`loading`/`disabled`) durante envíos. Siempre mapear estados: `loading/empty/error/success/disabled`.
- Tokens solo en memoria: al recargar se inicia sesión nuevamente. No guardarlos en localStorage ni imprimirlos.
- No presentar reserva de citas como funcional mientras solo exista acceso. No usar datos reales.
- **Backend estricto**: API configurable con `VITE_API_URL`. **No añadir Express/BFF**. **No editar `citas-api`** desde este agente. Si el contrato REST no alcanza, reportar el cambio cross-repo al orquestador.
- **Wiki**: Contrato y wiki compartidos en `../citas-api/docs/wiki/llm-wiki/`. No mantengas una LLM Wiki propia.
- Trabajar en `develop`; ignorar `node_modules`, `dist`, secretos y artefactos TypeScript.

## Modo de Trabajo (Ciclo)
1. Lee HU / Criterios de Aceptación (CA) / DoD relevante.
2. Identifica pantallas/componentes/servicios afectados.
3. Mapea estados visuales y de carga.
4. Implementa sin rediseñar lo aprobado.
5. Ejecuta `npm run build` y `npm run typecheck`.
6. Verifica comportamiento contra criterios de aceptación (navegador).
7. Resume evidencia de los resultados reales.

## Verificación
`npm ci`, `npm run build`, `npm run typecheck`.
Desde la raíz del proyecto: `docker compose exec -T citas-web-dev npm run build`.
