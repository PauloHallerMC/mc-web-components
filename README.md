# Componentes web de Marine Connection

Archivos compilados que usa el sitio www.marineconnection.cl (Wix Studio). Este repo es público
solo para que [jsDelivr](https://www.jsdelivr.com/) los sirva por HTTPS; **no se edita a mano**.

El código fuente, los datos y la documentación están en el repo privado
`PauloHallerMC/MC-website-WixStudio`, donde cada cambio se revisa en un PR. Desde ahí se compila y
se publica aquí una versión nueva, con su etiqueta `vX.Y.Z`.

## Contenido

| Archivo | Qué es |
|---|---|
| `rov-descent/mc-rov-descent.js` | Elemento personalizado `<mc-rov-descent>`: hero 3D con el descenso submarino |
| `rov-descent/patagonia-mk2.glb` | Modelo 3D del Patagonia MK2, optimizado para la web |
| `rov-descent/fondo-oceano.webp` | Fondo submarino de la hero |

## Direcciones

Siempre con la versión en la dirección, para que los navegadores no usen una copia vieja:

```
https://cdn.jsdelivr.net/gh/PauloHallerMC/mc-web-components@v0.1.1/rov-descent/mc-rov-descent.js
https://cdn.jsdelivr.net/gh/PauloHallerMC/mc-web-components@v0.1.1/rov-descent/patagonia-mk2.glb
https://cdn.jsdelivr.net/gh/PauloHallerMC/mc-web-components@v0.1.1/rov-descent/fondo-oceano.webp
```

## Derechos

© Marine Connection. Todos los derechos reservados. Los modelos 3D y el código se publican aquí
solo para que el sitio los cargue; no se otorga licencia de uso.
