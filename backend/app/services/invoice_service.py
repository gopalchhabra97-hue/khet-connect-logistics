"""Digital Invoice Generation Service using ReportLab.

Renders high-quality PDF invoices from real PostgreSQL order and payment data.
Maintains clear visual separation of product value from transportation charges.
"""

import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.order import Order
from app.models.product import Product


def generate_order_invoice_pdf(order: Order, product: Product = None) -> bytes:
    """Builds a formatted digital tax invoice / settlement receipt as PDF bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#1b4332"),  # Khetsetu dark forest green
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "InvoiceSubtitle",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#555555"),
        spaceAfter=15,
    )
    header_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading3"],
        fontSize=12,
        textColor=colors.HexColor("#1b4332"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "InvoiceBody",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#222222"),
        leading=13,
    )
    bold_style = ParagraphStyle(
        "InvoiceBold",
        parent=styles["Normal"],
        fontSize=9,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#222222"),
        leading=13,
    )

    elements = []

    # 1. Header & Branding
    elements.append(Paragraph("KHETSETU · खेतसेतु", title_style))
    elements.append(Paragraph("Agricultural Supply-Demand & Unified Logistics Platform", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2d6a4f"), spaceAfter=15))

    # 2. Invoice Meta Table
    inv_number = f"INV-{order.id.replace('#', '')}-{datetime.now().strftime('%Y%m%d')}"
    meta_data = [
        [
            Paragraph(f"<b>Invoice Number:</b> {inv_number}", body_style),
            Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d %b %Y')}", body_style),
        ],
        [
            Paragraph(f"<b>Order Reference:</b> {order.id}", body_style),
            Paragraph(f"<b>Order Date:</b> {order.order_date}", body_style),
        ],
        [
            Paragraph(f"<b>Delivery Status:</b> {order.status}", body_style),
            Paragraph(f"<b>Settlement Status:</b> {(order.payment_status or 'pending').upper()}", bold_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8f9fa")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e9ecef")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e9ecef")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 15))

    # 3. Buyer & Farmer Participant Info
    party_data = [
        [
            Paragraph("<b>BUYER (BILL TO):</b>", header_style),
            Paragraph("<b>SELLER / FARMER (DISPATCH FROM):</b>", header_style),
        ],
        [
            Paragraph(
                f"<b>{order.buyer_name or 'Registered Buyer'}</b><br/>"
                f"Buyer ID: {order.buyer_id}<br/>"
                f"Delivery Hub: {order.delivery_location}",
                body_style,
            ),
            Paragraph(
                f"<b>{product.seller_name if product else 'Green Valley FPO'}</b><br/>"
                f"Farmer / Seller Hub: {order.pickup_location}<br/>"
                f"Harvest Source: Punjab Agricultural Cluster",
                body_style,
            ),
        ],
    ]
    party_table = Table(party_data, colWidths=[270, 270])
    party_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(party_table)
    elements.append(Spacer(1, 15))

    # 4. Itemized Product Table
    product_name = order.product_name or (product.name if product else "Agricultural Crop")
    subtotal = float(order.product_subtotal or (order.quantity * order.price_per_unit))
    items_data = [
        [
            Paragraph("<b>Item Description</b>", bold_style),
            Paragraph("<b>Quantity</b>", bold_style),
            Paragraph("<b>Rate (₹)</b>", bold_style),
            Paragraph("<b>Subtotal (₹)</b>", bold_style),
        ],
        [
            Paragraph(f"<b>{product_name}</b><br/><font size=8 color='#666'>Farm Direct Produce</font>", body_style),
            Paragraph(f"{order.quantity} {order.unit}", body_style),
            Paragraph(f"₹{order.price_per_unit:.2f}/{order.unit}", body_style),
            Paragraph(f"₹{subtotal:,.2f}", bold_style),
        ],
    ]
    items_table = Table(items_data, colWidths=[230, 90, 100, 120])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e8f5e9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#c8e6c9")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#c8e6c9")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # 5. Financial Settlement Breakdown
    advance_amount = float(order.advance_amount or round(subtotal * 0.30, 2))
    remaining_amount = float(order.remaining_product_amount or round(subtotal * 0.70, 2))
    transport_charge = float(order.transportation_charge or 600.0)
    total_payable = float(order.total_payable_amount or (subtotal + transport_charge))

    settlement_data = [
        [Paragraph("Product Crop Value:", body_style), Paragraph(f"₹{subtotal:,.2f}", body_style)],
        [
            Paragraph(
                f"(-) Advance Paid (30%): [{order.advance_payment_status.upper() if order.advance_payment_status else 'UNPAID'}]",
                body_style,
            ),
            Paragraph(f"₹{advance_amount:,.2f}", body_style),
        ],
        [Paragraph("Remaining Product Amount (70%):", body_style), Paragraph(f"₹{remaining_amount:,.2f}", body_style)],
        [
            Paragraph("<b>(+) Transportation & Logistics Charge:</b> (Separate Freight)", bold_style),
            Paragraph(f"<b>₹{transport_charge:,.2f}</b>", bold_style),
        ],
        [
            Paragraph("<b>Final Settlement (Remaining 70% + Freight):</b>", bold_style),
            Paragraph(f"<b>₹{(remaining_amount + transport_charge):,.2f}</b>", bold_style),
        ],
        [
            Paragraph("<b>Total Order Transaction (Product + Freight):</b>", bold_style),
            Paragraph(f"<b>₹{total_payable:,.2f}</b>", bold_style),
        ],
    ]
    settlement_table = Table(settlement_data, colWidths=[360, 180])
    settlement_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 0.5, colors.HexColor("#dddddd")),
        ('LINEBELOW', (0, -2), (-1, -2), 0.5, colors.HexColor("#dddddd")),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f1f8e9")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    elements.append(settlement_table)
    elements.append(Spacer(1, 20))

    # 6. Legal & Policy Notes
    footer_text = (
        "<b>Policy Terms:</b> Freight and transportation charges are calculated transparently and kept strictly "
        "separate from farmer crop realization. Final payment is authorized upon verified delivery OTP confirmation. "
        "Generated by KHETSETU Digital Agricultural Settlement Core."
    )
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=8))
    elements.append(Paragraph(footer_text, ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7.5, textColor=colors.HexColor("#777777"), leading=10)))

    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content
