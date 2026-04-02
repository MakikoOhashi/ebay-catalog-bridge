import AppKit

let outputPath = CommandLine.arguments.dropFirst().first ?? "public/feature-media.png"

let width: CGFloat = 1600
let height: CGFloat = 900
let canvasSize = NSSize(width: width, height: height)

func rgb(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1.0) -> NSColor {
  NSColor(calibratedRed: r / 255, green: g / 255, blue: b / 255, alpha: a)
}

func roundedRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = lineWidth
    path.stroke()
  }
}

func drawText(
  _ text: String,
  in rect: NSRect,
  font: NSFont,
  color: NSColor,
  paragraph: NSParagraphStyle? = nil
) {
  let style = (paragraph?.mutableCopy() as? NSMutableParagraphStyle) ?? NSMutableParagraphStyle()
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color,
    .paragraphStyle: style,
  ]
  NSString(string: text).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes)
}

func fillLinearGradient(in rect: NSRect, from startColor: NSColor, to endColor: NSColor, angle: CGFloat) {
  let gradient = NSGradient(starting: startColor, ending: endColor)
  gradient?.draw(in: rect, angle: angle)
}

func drawCircle(center: NSPoint, radius: CGFloat, color: NSColor) {
  let rect = NSRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
  let path = NSBezierPath(ovalIn: rect)
  color.setFill()
  path.fill()
}

func drawBridgeIcon(in rect: NSRect) {
  let teal = rgb(15, 118, 110)
  teal.setFill()

  let bridgeDeck = NSBezierPath(roundedRect: NSRect(x: rect.minX, y: rect.midY - 8, width: rect.width, height: 16), xRadius: 6, yRadius: 6)
  bridgeDeck.fill()

  let leftPillar = NSBezierPath(roundedRect: NSRect(x: rect.minX + 8, y: rect.minY + 4, width: 10, height: rect.height * 0.55), xRadius: 5, yRadius: 5)
  leftPillar.fill()

  let rightPillar = NSBezierPath(roundedRect: NSRect(x: rect.maxX - 18, y: rect.minY + 4, width: 10, height: rect.height * 0.55), xRadius: 5, yRadius: 5)
  rightPillar.fill()

  let arch = NSBezierPath()
  arch.move(to: NSPoint(x: rect.minX + 22, y: rect.midY))
  arch.curve(to: NSPoint(x: rect.maxX - 22, y: rect.midY),
             controlPoint1: NSPoint(x: rect.minX + rect.width * 0.33, y: rect.maxY - 8),
             controlPoint2: NSPoint(x: rect.minX + rect.width * 0.67, y: rect.maxY - 8))
  arch.lineWidth = 10
  arch.stroke()

  for idx in 0..<4 {
    let x = rect.minX + 36 + CGFloat(idx) * 28
    let support = NSBezierPath()
    support.move(to: NSPoint(x: x, y: rect.midY + 2))
    support.line(to: NSPoint(x: x - 10, y: rect.minY + 14))
    support.lineWidth = 6
    support.stroke()

    let support2 = NSBezierPath()
    support2.move(to: NSPoint(x: rect.maxX - (x - rect.minX), y: rect.midY + 2))
    support2.line(to: NSPoint(x: rect.maxX - (x - rect.minX) + 10, y: rect.minY + 14))
    support2.lineWidth = 6
    support2.stroke()
  }
}

func font(_ size: CGFloat, weight: NSFont.Weight) -> NSFont {
  NSFont.systemFont(ofSize: size, weight: weight)
}

let image = NSImage(size: canvasSize)
image.lockFocus()

fillLinearGradient(in: NSRect(origin: .zero, size: canvasSize), from: rgb(248, 250, 252), to: rgb(230, 255, 251), angle: -18)

drawCircle(center: NSPoint(x: 1380, y: 770), radius: 210, color: rgb(204, 251, 241, 0.8))
drawCircle(center: NSPoint(x: 240, y: 90), radius: 175, color: rgb(191, 219, 254, 0.42))
drawCircle(center: NSPoint(x: 1490, y: 110), radius: 140, color: rgb(254, 215, 170, 0.58))

roundedRect(NSRect(x: 90, y: 714, width: 92, height: 92), radius: 24, fill: rgb(255, 255, 255))
drawBridgeIcon(in: NSRect(x: 106, y: 732, width: 58, height: 48))

drawText(
  "ebay-catalog-bridge",
  in: NSRect(x: 214, y: 758, width: 360, height: 28),
  font: font(22, weight: .bold),
  color: rgb(15, 23, 42)
)
drawText(
  "eBay catalog sync for Shopify stores",
  in: NSRect(x: 214, y: 728, width: 420, height: 24),
  font: font(16, weight: .regular),
  color: rgb(71, 85, 105)
)

drawText(
  "eBayの商品情報を\nSKU基準で一方向同期",
  in: NSRect(x: 90, y: 545, width: 720, height: 180),
  font: font(64, weight: .heavy),
  color: rgb(15, 23, 42)
)
drawText(
  "商品名・説明文・画像・重量・在庫・価格をまとめて反映\n1ストアに最大4つのeBayアカウントを接続できます",
  in: NSRect(x: 90, y: 425, width: 720, height: 95),
  font: font(24, weight: .medium),
  color: rgb(51, 65, 85)
)

func drawChip(x: CGFloat, y: CGFloat, color: NSColor, text: String, width: CGFloat) {
  roundedRect(NSRect(x: x, y: y, width: width, height: 54), radius: 18, fill: rgb(255, 255, 255), stroke: rgb(203, 213, 225))
  drawCircle(center: NSPoint(x: x + 28, y: y + 27), radius: 14, color: color)
  drawText(text, in: NSRect(x: x + 54, y: y + 12, width: width - 70, height: 30), font: font(20, weight: .bold), color: rgb(15, 23, 42))
}

drawChip(x: 90, y: 285, color: rgb(15, 118, 110), text: "最大4アカウント", width: 240)
drawChip(x: 352, y: 285, color: rgb(251, 146, 60), text: "一方向同期", width: 210)
drawChip(x: 584, y: 285, color: rgb(37, 99, 235), text: "Slack通知", width: 200)

roundedRect(NSRect(x: 892, y: 92, width: 608, height: 716), radius: 32, fill: rgb(255, 255, 255))
fillLinearGradient(in: NSRect(x: 892, y: 92, width: 608, height: 716), from: rgb(255, 255, 255), to: rgb(238, 246, 255), angle: -24)
roundedRect(NSRect(x: 892, y: 726, width: 608, height: 82), radius: 32, fill: rgb(255, 255, 255))
drawText("Sync Console", in: NSRect(x: 924, y: 746, width: 220, height: 32), font: font(28, weight: .heavy), color: rgb(15, 23, 42))
roundedRect(NSRect(x: 1368, y: 748, width: 100, height: 36), radius: 12, fill: rgb(15, 23, 42))
drawText("保存済み", in: NSRect(x: 1368, y: 757, width: 100, height: 22), font: font(16, weight: .bold), color: rgb(255, 255, 255), paragraph: {
  let style = NSMutableParagraphStyle()
  style.alignment = .center
  return style
}())

roundedRect(NSRect(x: 920, y: 578, width: 552, height: 114), radius: 22, fill: rgb(255, 255, 255))
drawText("1. eBayアカウントを接続する", in: NSRect(x: 944, y: 640, width: 290, height: 26), font: font(20, weight: .bold), color: rgb(15, 23, 42))
roundedRect(NSRect(x: 944, y: 600, width: 192, height: 34), radius: 12, fill: rgb(236, 254, 255), stroke: rgb(153, 246, 228))
drawText("接続済み 1 / 4", in: NSRect(x: 962, y: 607, width: 160, height: 22), font: font(16, weight: .bold), color: rgb(15, 118, 110))
roundedRect(NSRect(x: 1160, y: 600, width: 288, height: 34), radius: 12, fill: rgb(248, 250, 252), stroke: rgb(203, 213, 225))
drawText("mm.msc76 / primary", in: NSRect(x: 1178, y: 607, width: 244, height: 22), font: font(16, weight: .medium), color: rgb(71, 85, 105))

roundedRect(NSRect(x: 920, y: 350, width: 266, height: 196), radius: 22, fill: rgb(255, 255, 255))
drawText("同期設定", in: NSRect(x: 944, y: 500, width: 120, height: 26), font: font(20, weight: .bold), color: rgb(15, 23, 42))
drawText("毎日1回（夜間）", in: NSRect(x: 944, y: 468, width: 180, height: 22), font: font(16, weight: .medium), color: rgb(71, 85, 105))
roundedRect(NSRect(x: 944, y: 422, width: 104, height: 32), radius: 10, fill: rgb(236, 254, 255))
drawText("images", in: NSRect(x: 944, y: 429, width: 104, height: 20), font: font(15, weight: .bold), color: rgb(15, 118, 110), paragraph: {
  let style = NSMutableParagraphStyle()
  style.alignment = .center
  return style
}())
roundedRect(NSRect(x: 1060, y: 422, width: 104, height: 32), radius: 10, fill: rgb(236, 254, 255))
drawText("weight", in: NSRect(x: 1060, y: 429, width: 104, height: 20), font: font(15, weight: .bold), color: rgb(15, 118, 110), paragraph: {
  let style = NSMutableParagraphStyle()
  style.alignment = .center
  return style
}())
roundedRect(NSRect(x: 944, y: 374, width: 220, height: 36), radius: 12, fill: rgb(248, 250, 252), stroke: rgb(203, 213, 225))
drawText("SKUで商品を追跡", in: NSRect(x: 960, y: 382, width: 180, height: 20), font: font(15, weight: .medium), color: rgb(51, 65, 85))

roundedRect(NSRect(x: 1206, y: 350, width: 266, height: 196), radius: 22, fill: rgb(255, 255, 255))
drawText("価格設定", in: NSRect(x: 1230, y: 500, width: 120, height: 26), font: font(20, weight: .bold), color: rgb(15, 23, 42))
drawText("Auto Fetch (Frankfurter)", in: NSRect(x: 1230, y: 468, width: 210, height: 22), font: font(16, weight: .medium), color: rgb(71, 85, 105))
drawText("1 USD = 159.46 JPY", in: NSRect(x: 1230, y: 420, width: 220, height: 34), font: font(32, weight: .heavy), color: rgb(15, 23, 42))
roundedRect(NSRect(x: 1230, y: 378, width: 116, height: 32), radius: 10, fill: rgb(239, 246, 255))
drawText("価格同期 ON", in: NSRect(x: 1230, y: 385, width: 116, height: 20), font: font(15, weight: .bold), color: rgb(29, 78, 216), paragraph: {
  let style = NSMutableParagraphStyle()
  style.alignment = .center
  return style
}())

roundedRect(NSRect(x: 920, y: 184, width: 552, height: 132), radius: 22, fill: rgb(255, 255, 255))
drawText("実行結果", in: NSRect(x: 944, y: 274, width: 120, height: 26), font: font(20, weight: .bold), color: rgb(15, 23, 42))
fillLinearGradient(in: NSRect(x: 944, y: 212, width: 170, height: 60), from: rgb(15, 118, 110), to: rgb(14, 165, 164), angle: 0)
roundedRect(NSRect(x: 944, y: 212, width: 170, height: 60), radius: 16, fill: NSColor.clear)
drawText("最新の同期", in: NSRect(x: 964, y: 245, width: 120, height: 18), font: font(15, weight: .bold), color: rgb(204, 251, 241))
drawText("succeeded", in: NSRect(x: 964, y: 222, width: 150, height: 22), font: font(24, weight: .heavy), color: rgb(255, 255, 255))

roundedRect(NSRect(x: 1138, y: 212, width: 152, height: 60), radius: 16, fill: rgb(248, 250, 252), stroke: rgb(203, 213, 225))
drawText("更新", in: NSRect(x: 1160, y: 245, width: 60, height: 18), font: font(15, weight: .bold), color: rgb(100, 116, 139))
drawText("2", in: NSRect(x: 1160, y: 222, width: 40, height: 22), font: font(24, weight: .heavy), color: rgb(15, 23, 42))

roundedRect(NSRect(x: 1310, y: 212, width: 162, height: 60), radius: 16, fill: rgb(248, 250, 252), stroke: rgb(203, 213, 225))
drawText("エラー", in: NSRect(x: 1332, y: 245, width: 60, height: 18), font: font(15, weight: .bold), color: rgb(100, 116, 139))
drawText("0", in: NSRect(x: 1332, y: 222, width: 40, height: 22), font: font(24, weight: .heavy), color: rgb(15, 23, 42))

roundedRect(NSRect(x: 920, y: 110, width: 552, height: 50), radius: 18, fill: rgb(15, 23, 42))
drawText("商品一覧・設定・通知を1画面で確認", in: NSRect(x: 950, y: 123, width: 490, height: 22), font: font(20, weight: .bold), color: rgb(255, 255, 255))

image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let png = bitmap.representation(using: .png, properties: [:])
else {
  fputs("Failed to generate image data.\n", stderr)
  exit(1)
}

let url = URL(fileURLWithPath: outputPath)
try png.write(to: url)
print("Wrote \(outputPath)")
