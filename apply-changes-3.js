const fs = require('fs');

function applyOps(path, ops) {
  let content = fs.readFileSync(path, 'utf8');
  ops.forEach((op, i) => {
    const count = content.split(op.anchor).length - 1;
    if (count !== 1) {
      console.error(`ERROR en ${path}, cambio #${i + 1}: se esperaba encontrar el texto ancla 1 vez, se encontró ${count} veces.`);
      console.error(`Ancla: ${op.anchor.slice(0, 100)}`);
      process.exit(1);
    }
    if (op.type === 'insertAfter') {
      content = content.replace(op.anchor, op.anchor + op.content);
    } else if (op.type === 'insertBefore') {
      content = content.replace(op.anchor, op.content + op.anchor);
    } else if (op.type === 'replace') {
      content = content.replace(op.anchor, op.content);
    }
  });
  fs.writeFileSync(path, content, 'utf8');
  console.log(`OK: ${path} actualizado (${ops.length} cambios aplicados)`);
}

const portalOps = [
  { type: 'replace', anchor: `return Boolean(profile.name && profile.category && profile.address && profile.city && profile.phone && profile.schedule);`, content: `return Boolean(profile.name && profile.category && profile.address && profile.city && profile.schedule);` },
  { type: 'replace', anchor: `if (!state.profile.name.trim() || !state.profile.address.trim() || !state.profile.city.trim() || !state.profile.phone.trim() || !state.profile.schedule.trim()) {\n      setNotice("Completá nombre, dirección, ciudad, teléfono y horario antes de guardar.");\n      return;\n    }`, content: `if (!state.profile.name.trim() || !state.profile.address.trim() || !state.profile.city.trim() || !state.profile.schedule.trim()) {\n      setNotice("Completá nombre, dirección, ciudad y horario antes de guardar. El teléfono es opcional.");\n      return;\n    }` },
  { type: 'replace', anchor: `<Text style={[styles.priceText, { color: colors.primary }]}>{money(offer.offerPrice)} <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "400" }}>antes {money(offer.originalPrice)}</Text></Text>`, content: `<Text style={[styles.priceText, { color: colors.primary }]}>{money(offer.offerPrice)}{offer.quantity && offer.quantity !== 1 ? \` (\${offer.quantity})\` : ""} <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "400" }}>antes {money(offer.originalPrice)}</Text></Text>` },
];

applyOps('app/portal-comercios.tsx', portalOps);
