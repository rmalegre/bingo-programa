# Sorteo 100 — Modo Proyección

Proyecto React + Vite para sortear los números del 1 al 100 sin repetición.

## Funciones

- 📺 Modo Proyección para TV/proyector.
- 🔢 Número gigante en el centro.
- 🎲 Animación de sorteo.
- ✨ Efecto visual al revelar el número.
- 📜 Últimos números sorteados.
- 📊 Cantidad sorteada/restante y barra de progreso.
- 🖥️ Pantalla completa con Fullscreen API.
- 🔒 Sin repetición.
- 💾 Persistencia automática mediante localStorage.
- 🎉 Animación especial al completar los 100.
- ❌ Sin narración ni síntesis de voz.

## Ejecutar

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
npm run preview
```

### Uso

1. Pulsa **Pantalla completa** para pasar al modo proyección.
2. Pulsa **SORTEAR NÚMERO** para iniciar cada extracción.
3. El estado queda guardado automáticamente en el navegador.
4. Los números sorteados no vuelven a entrar al grupo disponible.
5. Al llegar a 100 aparece la pantalla especial de finalización.

> Para comenzar otro sorteo desde el modo control, utiliza **Nuevo sorteo**.
