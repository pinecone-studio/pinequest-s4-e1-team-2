const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const navigationPath = path.resolve(
  __dirname,
  "../assets/floorplans/gurvan-gol-floor-3.navigation.json",
);
const outputDir = path.resolve(__dirname, "../assets/floorplans/qrcodes");

async function main() {
  const navigationData = JSON.parse(fs.readFileSync(navigationPath, "utf8"));

  fs.mkdirSync(outputDir, { recursive: true });

  for (const anchor of navigationData.qrAnchors) {
    const payload = {
      type: "indoor_anchor",
      buildingId: anchor.buildingId,
      floor: anchor.floor,
      anchorId: anchor.id,
    };
    const safeLabel = anchor.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${navigationData.buildingId}-floor-${navigationData.floor}-${anchor.id}-${safeLabel || "anchor"}.png`;
    const outputPath = path.join(outputDir, fileName);

    await QRCode.toFile(outputPath, JSON.stringify(payload), {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
    });

    console.log(`${anchor.label}: ${outputPath}`);
    console.log(JSON.stringify(payload));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
