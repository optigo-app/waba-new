// Real starter templates — documents rendered via central-email-builder's
// own renderToStaticMarkup, so card previews and the editor load real data.
// Regenerate with scripts/gen-email-fixtures if starter templates change.
export const EMAIL_TEMPLATES = [
  {
    "Id": "tpl_welcome",
    "TemplateName": "Welcome",
    "Variant": "standard",
    "Subject": "Welcome to Optigo, {{first_name}}!",
    "Category": "Onboarding",
    "Accent": "#6C5CE7",
    "From": "noreply@yourbrand.com",
    "Status": "ACTIVE",
    "UpdatedAt": "2026-02-08T10:30:00Z",
    "PreviewText": "Your account is ready. Start designing emails that look great on every device — no code needed.",
    "Document": {
      "root": {
        "type": "EmailLayout",
        "data": {
          "backdropColor": "#F5F5F5",
          "canvasColor": "#FFFFFF",
          "textColor": "#262626",
          "fontFamily": "MODERN_SANS",
          "childrenIds": [
            "w_hero",
            "w_h",
            "w_t",
            "w_btn",
            "w_d",
            "w_f"
          ]
        }
      },
      "w_hero": {
        "type": "Container",
        "data": {
          "props": {
            "childrenIds": [
              "w_h",
              "w_t",
              "w_btn"
            ]
          },
          "style": {
            "padding": {
              "top": 28,
              "bottom": 28,
              "left": 24,
              "right": 24
            },
            "backgroundColor": "#6C5CE7"
          }
        }
      },
      "w_h": {
        "type": "Heading",
        "data": {
          "props": {
            "text": "Welcome to Optigo",
            "level": "h1"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "color": "#FFFFFF",
            "textAlign": "center"
          }
        }
      },
      "w_t": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Your account is ready. Start designing emails that look great on every device — no code needed."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "color": "#E6E2FB",
            "textAlign": "center"
          }
        }
      },
      "w_btn": {
        "type": "Button",
        "data": {
          "props": {
            "text": "Open the editor",
            "url": "https://example.com"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "center"
          }
        }
      },
      "w_d": {
        "type": "Divider",
        "data": {
          "props": {
            "lineColor": "#E6E6E6"
          },
          "style": {
            "padding": {
              "top": 8,
              "bottom": 8,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "w_f": {
        "type": "Text",
        "data": {
          "props": {
            "text": "You received this email because you signed up for Optigo."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontSize": 12,
            "color": "#8A8A95",
            "textAlign": "center"
          }
        }
      }
    },
    "Html": "<!DOCTYPE html><html><body><div style=\"background-color:#F5F5F5;color:#262626;font-family:&quot;Helvetica Neue&quot;, &quot;Arial Nova&quot;, &quot;Nimbus Sans&quot;, Arial, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%\"><table align=\"center\" width=\"100%\" style=\"margin:0 auto;max-width:600px;background-color:#FFFFFF\" role=\"presentation\" cellSpacing=\"0\" cellPadding=\"0\" border=\"0\"><tbody><tr style=\"width:100%\"><td><div style=\"background-color:#6C5CE7;padding:28px 24px 28px 24px\"><h1 style=\"color:#FFFFFF;font-weight:bold;text-align:center;margin:0;font-size:32px;padding:16px 24px 16px 24px\">Welcome to Optigo</h1><div style=\"color:#E6E2FB;text-align:center;padding:16px 24px 16px 24px\">Your account is ready. Start designing emails that look great on every device — no code needed.</div><div style=\"text-align:center;padding:16px 24px 16px 24px\"><a href=\"https://example.com\" style=\"color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#999999;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none\" target=\"_blank\"><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30\" hidden>&nbsp;</i><![endif]--></span><span>Open the editor</span><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%\" hidden>&nbsp;</i><![endif]--></span></a></div></div><h1 style=\"color:#FFFFFF;font-weight:bold;text-align:center;margin:0;font-size:32px;padding:16px 24px 16px 24px\">Welcome to Optigo</h1><div style=\"color:#E6E2FB;text-align:center;padding:16px 24px 16px 24px\">Your account is ready. Start designing emails that look great on every device — no code needed.</div><div style=\"text-align:center;padding:16px 24px 16px 24px\"><a href=\"https://example.com\" style=\"color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#999999;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none\" target=\"_blank\"><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30\" hidden>&nbsp;</i><![endif]--></span><span>Open the editor</span><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%\" hidden>&nbsp;</i><![endif]--></span></a></div><div style=\"padding:8px 24px 8px 24px\"><hr style=\"width:100%;border:none;border-top:1px solid #E6E6E6;margin:0\"/></div><div style=\"color:#8A8A95;font-size:12px;text-align:center;padding:16px 24px 16px 24px\">You received this email because you signed up for Optigo.</div></td></tr></tbody></table></div></body></html>"
  },
  {
    "Id": "tpl_order",
    "TemplateName": "Order confirmation",
    "Variant": "standard",
    "Subject": "Your order #{{order_id}} is confirmed",
    "Category": "Transactional",
    "Accent": "#28c76f",
    "From": "orders@yourbrand.com",
    "Status": "ACTIVE",
    "UpdatedAt": "2026-02-05T15:45:00Z",
    "PreviewText": "Hi {{first_name}}, your order #{{order_id}} is confirmed and being prepared.",
    "Document": {
      "root": {
        "type": "EmailLayout",
        "data": {
          "backdropColor": "#F5F5F5",
          "canvasColor": "#FFFFFF",
          "textColor": "#262626",
          "fontFamily": "MODERN_SANS",
          "childrenIds": [
            "o_h",
            "o_t",
            "o_items",
            "o_i1",
            "o_i2",
            "o_p1",
            "o_p2",
            "o_d",
            "o_total",
            "o_btn"
          ]
        }
      },
      "o_h": {
        "type": "Heading",
        "data": {
          "props": {
            "text": "Order confirmed",
            "level": "h2"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "o_t": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Hi {{first_name}}, your order #{{order_id}} is confirmed and being prepared. Here's a summary:"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "o_items": {
        "type": "ColumnsContainer",
        "data": {
          "props": {
            "columnsGap": 16,
            "columnsCount": 2,
            "columns": [
              {
                "childrenIds": [
                  "o_i1",
                  "o_i2"
                ]
              },
              {
                "childrenIds": [
                  "o_p1",
                  "o_p2"
                ]
              },
              {
                "childrenIds": []
              }
            ]
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "o_i1": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Wireless headset"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontWeight": "bold"
          }
        }
      },
      "o_i2": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Canvas tote bag"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontWeight": "bold"
          }
        }
      },
      "o_p1": {
        "type": "Text",
        "data": {
          "props": {
            "text": "$79.00"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "right"
          }
        }
      },
      "o_p2": {
        "type": "Text",
        "data": {
          "props": {
            "text": "$24.00"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "right"
          }
        }
      },
      "o_d": {
        "type": "Divider",
        "data": {
          "props": {
            "lineColor": "#E6E6E6"
          },
          "style": {
            "padding": {
              "top": 8,
              "bottom": 8,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "o_total": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Total: $103.00"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontWeight": "bold",
            "textAlign": "right"
          }
        }
      },
      "o_btn": {
        "type": "Button",
        "data": {
          "props": {
            "text": "Track your order",
            "url": "https://example.com"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      }
    },
    "Html": "<!DOCTYPE html><html><body><div style=\"background-color:#F5F5F5;color:#262626;font-family:&quot;Helvetica Neue&quot;, &quot;Arial Nova&quot;, &quot;Nimbus Sans&quot;, Arial, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%\"><table align=\"center\" width=\"100%\" style=\"margin:0 auto;max-width:600px;background-color:#FFFFFF\" role=\"presentation\" cellSpacing=\"0\" cellPadding=\"0\" border=\"0\"><tbody><tr style=\"width:100%\"><td><h2 style=\"font-weight:bold;margin:0;font-size:24px;padding:16px 24px 16px 24px\">Order confirmed</h2><div style=\"padding:16px 24px 16px 24px\">Hi {{first_name}}, your order #{{order_id}} is confirmed and being prepared. Here&#x27;s a summary:</div><div style=\"padding:16px 24px 16px 24px\"><table align=\"center\" width=\"100%\" cellPadding=\"0\" border=\"0\" style=\"table-layout:fixed;border-collapse:collapse\"><tbody style=\"width:100%\"><tr style=\"width:100%\"><td style=\"box-sizing:content-box;vertical-align:middle;padding-left:0;padding-right:8px\"><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Wireless headset</div><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Canvas tote bag</div></td><td style=\"box-sizing:content-box;vertical-align:middle;padding-left:8px;padding-right:0\"><div style=\"text-align:right;padding:16px 24px 16px 24px\">$79.00</div><div style=\"text-align:right;padding:16px 24px 16px 24px\">$24.00</div></td></tr></tbody></table></div><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Wireless headset</div><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Canvas tote bag</div><div style=\"text-align:right;padding:16px 24px 16px 24px\">$79.00</div><div style=\"text-align:right;padding:16px 24px 16px 24px\">$24.00</div><div style=\"padding:8px 24px 8px 24px\"><hr style=\"width:100%;border:none;border-top:1px solid #E6E6E6;margin:0\"/></div><div style=\"font-weight:bold;text-align:right;padding:16px 24px 16px 24px\">Total: $103.00</div><div style=\"padding:16px 24px 16px 24px\"><a href=\"https://example.com\" style=\"color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#999999;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none\" target=\"_blank\"><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30\" hidden>&nbsp;</i><![endif]--></span><span>Track your order</span><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%\" hidden>&nbsp;</i><![endif]--></span></a></div></td></tr></tbody></table></div></body></html>"
  },
  {
    "Id": "tpl_newsletter",
    "TemplateName": "Newsletter",
    "Variant": "standard",
    "Subject": "The October digest — what's new",
    "Category": "Marketing",
    "Accent": "#03c3ec",
    "From": "news@yourbrand.com",
    "Status": "ACTIVE",
    "UpdatedAt": "2026-02-01T09:15:00Z",
    "PreviewText": "New blocks, faster exports and a smarter AI assistant — here is what shipped this month.",
    "Document": {
      "root": {
        "type": "EmailLayout",
        "data": {
          "backdropColor": "#F5F5F5",
          "canvasColor": "#FFFFFF",
          "textColor": "#262626",
          "fontFamily": "MODERN_SANS",
          "childrenIds": [
            "n_img",
            "n_h",
            "n_t",
            "n_d",
            "n_f"
          ]
        }
      },
      "n_img": {
        "type": "Image",
        "data": {
          "props": {
            "url": "https://assets.usewaypoint.com/sample-image.jpg",
            "alt": "This month in product",
            "contentAlignment": "middle",
            "linkHref": null
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "n_h": {
        "type": "Heading",
        "data": {
          "props": {
            "text": "The October digest",
            "level": "h2"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "n_t": {
        "type": "Text",
        "data": {
          "props": {
            "text": "New blocks, faster exports and a smarter AI assistant — here's what shipped this month."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "n_d": {
        "type": "Divider",
        "data": {
          "props": {
            "lineColor": "#E6E6E6"
          },
          "style": {
            "padding": {
              "top": 8,
              "bottom": 8,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "n_f": {
        "type": "Text",
        "data": {
          "props": {
            "text": "You're receiving this because you subscribed to product updates. Unsubscribe anytime."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontSize": 12,
            "color": "#8A8A95"
          }
        }
      }
    },
    "Html": "<!DOCTYPE html><html><body><div style=\"background-color:#F5F5F5;color:#262626;font-family:&quot;Helvetica Neue&quot;, &quot;Arial Nova&quot;, &quot;Nimbus Sans&quot;, Arial, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%\"><table align=\"center\" width=\"100%\" style=\"margin:0 auto;max-width:600px;background-color:#FFFFFF\" role=\"presentation\" cellSpacing=\"0\" cellPadding=\"0\" border=\"0\"><tbody><tr style=\"width:100%\"><td><div style=\"padding:16px 24px 16px 24px\"><img alt=\"This month in product\" src=\"https://assets.usewaypoint.com/sample-image.jpg\" style=\"outline:none;border:none;text-decoration:none;vertical-align:middle;display:inline-block;max-width:100%\"/></div><h2 style=\"font-weight:bold;margin:0;font-size:24px;padding:16px 24px 16px 24px\">The October digest</h2><div style=\"padding:16px 24px 16px 24px\">New blocks, faster exports and a smarter AI assistant — here&#x27;s what shipped this month.</div><div style=\"padding:8px 24px 8px 24px\"><hr style=\"width:100%;border:none;border-top:1px solid #E6E6E6;margin:0\"/></div><div style=\"color:#8A8A95;font-size:12px;padding:16px 24px 16px 24px\">You&#x27;re receiving this because you subscribed to product updates. Unsubscribe anytime.</div></td></tr></tbody></table></div></body></html>"
  },
  {
    "Id": "tpl_promo",
    "TemplateName": "Promo sale",
    "Variant": "standard",
    "Subject": "Exclusive Diwali Sale — up to 30% off",
    "Category": "Marketing",
    "Accent": "#ff9f43",
    "From": "offers@yourbrand.com",
    "Status": "DRAFT",
    "UpdatedAt": "2026-01-28T08:20:00Z",
    "PreviewText": "Take 30% off every template in the library. Sale ends Sunday midnight.",
    "Document": {
      "root": {
        "type": "EmailLayout",
        "data": {
          "backdropColor": "#F5F5F5",
          "canvasColor": "#FFFFFF",
          "textColor": "#262626",
          "fontFamily": "MODERN_SANS",
          "childrenIds": [
            "p_hero",
            "p_h",
            "p_t",
            "p_btn",
            "p_s",
            "p_f"
          ]
        }
      },
      "p_hero": {
        "type": "Container",
        "data": {
          "props": {
            "childrenIds": [
              "p_h",
              "p_t",
              "p_btn"
            ]
          },
          "style": {
            "padding": {
              "top": 28,
              "bottom": 28,
              "left": 24,
              "right": 24
            },
            "backgroundColor": "#171321"
          }
        }
      },
      "p_h": {
        "type": "Heading",
        "data": {
          "props": {
            "text": "48-hour sale",
            "level": "h1"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "color": "#FFFFFF",
            "textAlign": "center"
          }
        }
      },
      "p_t": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Take 30% off every template in the library. Sale ends Sunday midnight."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "color": "#C9C3E8",
            "textAlign": "center"
          }
        }
      },
      "p_btn": {
        "type": "Button",
        "data": {
          "props": {
            "text": "Shop the sale",
            "url": "https://example.com/sale"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "center"
          }
        }
      },
      "p_s": {
        "type": "Spacer",
        "data": {
          "props": {
            "height": 24
          }
        }
      },
      "p_f": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Offer applies to new purchases only."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontSize": 12,
            "color": "#8A8A95",
            "textAlign": "center"
          }
        }
      }
    },
    "Html": "<!DOCTYPE html><html><body><div style=\"background-color:#F5F5F5;color:#262626;font-family:&quot;Helvetica Neue&quot;, &quot;Arial Nova&quot;, &quot;Nimbus Sans&quot;, Arial, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%\"><table align=\"center\" width=\"100%\" style=\"margin:0 auto;max-width:600px;background-color:#FFFFFF\" role=\"presentation\" cellSpacing=\"0\" cellPadding=\"0\" border=\"0\"><tbody><tr style=\"width:100%\"><td><div style=\"background-color:#171321;padding:28px 24px 28px 24px\"><h1 style=\"color:#FFFFFF;font-weight:bold;text-align:center;margin:0;font-size:32px;padding:16px 24px 16px 24px\">48-hour sale</h1><div style=\"color:#C9C3E8;text-align:center;padding:16px 24px 16px 24px\">Take 30% off every template in the library. Sale ends Sunday midnight.</div><div style=\"text-align:center;padding:16px 24px 16px 24px\"><a href=\"https://example.com/sale\" style=\"color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#999999;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none\" target=\"_blank\"><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30\" hidden>&nbsp;</i><![endif]--></span><span>Shop the sale</span><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%\" hidden>&nbsp;</i><![endif]--></span></a></div></div><h1 style=\"color:#FFFFFF;font-weight:bold;text-align:center;margin:0;font-size:32px;padding:16px 24px 16px 24px\">48-hour sale</h1><div style=\"color:#C9C3E8;text-align:center;padding:16px 24px 16px 24px\">Take 30% off every template in the library. Sale ends Sunday midnight.</div><div style=\"text-align:center;padding:16px 24px 16px 24px\"><a href=\"https://example.com/sale\" style=\"color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#999999;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none\" target=\"_blank\"><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30\" hidden>&nbsp;</i><![endif]--></span><span>Shop the sale</span><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%\" hidden>&nbsp;</i><![endif]--></span></a></div><div style=\"height:24px\"></div><div style=\"color:#8A8A95;font-size:12px;text-align:center;padding:16px 24px 16px 24px\">Offer applies to new purchases only.</div></td></tr></tbody></table></div></body></html>"
  },
  {
    "Id": "tpl_invoice",
    "TemplateName": "Invoice",
    "Variant": "standard",
    "Subject": "Invoice #1042 is ready",
    "Category": "Transactional",
    "Accent": "#4b465c",
    "From": "billing@yourbrand.com",
    "Status": "ACTIVE",
    "UpdatedAt": "2026-01-20T12:00:00Z",
    "PreviewText": "Your October invoice is ready. Payment is due within 14 days.",
    "Document": {
      "root": {
        "type": "EmailLayout",
        "data": {
          "backdropColor": "#F5F5F5",
          "canvasColor": "#FFFFFF",
          "textColor": "#262626",
          "fontFamily": "MODERN_SANS",
          "childrenIds": [
            "i_h",
            "i_t",
            "i_d1",
            "i_rows",
            "i_l1",
            "i_l2",
            "i_v1",
            "i_v2",
            "i_d2",
            "i_total",
            "i_btn"
          ]
        }
      },
      "i_h": {
        "type": "Heading",
        "data": {
          "props": {
            "text": "Invoice #1042",
            "level": "h2"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "i_t": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Your October invoice is ready. Payment is due within 14 days."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "i_d1": {
        "type": "Divider",
        "data": {
          "props": {
            "lineColor": "#E6E6E6"
          },
          "style": {
            "padding": {
              "top": 8,
              "bottom": 8,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "i_rows": {
        "type": "ColumnsContainer",
        "data": {
          "props": {
            "columnsGap": 16,
            "columnsCount": 2,
            "columns": [
              {
                "childrenIds": [
                  "i_l1",
                  "i_l2"
                ]
              },
              {
                "childrenIds": [
                  "i_v1",
                  "i_v2"
                ]
              },
              {
                "childrenIds": []
              }
            ]
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "i_l1": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Pro plan — monthly"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontWeight": "bold"
          }
        }
      },
      "i_l2": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Extra seats × 3"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontWeight": "bold"
          }
        }
      },
      "i_v1": {
        "type": "Text",
        "data": {
          "props": {
            "text": "$49.00"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "right"
          }
        }
      },
      "i_v2": {
        "type": "Text",
        "data": {
          "props": {
            "text": "$27.00"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "right"
          }
        }
      },
      "i_d2": {
        "type": "Divider",
        "data": {
          "props": {
            "lineColor": "#E6E6E6"
          },
          "style": {
            "padding": {
              "top": 8,
              "bottom": 8,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "i_total": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Total due: $76.00"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontWeight": "bold",
            "textAlign": "right"
          }
        }
      },
      "i_btn": {
        "type": "Button",
        "data": {
          "props": {
            "text": "Pay invoice",
            "url": "https://example.com"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            }
          }
        }
      }
    },
    "Html": "<!DOCTYPE html><html><body><div style=\"background-color:#F5F5F5;color:#262626;font-family:&quot;Helvetica Neue&quot;, &quot;Arial Nova&quot;, &quot;Nimbus Sans&quot;, Arial, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%\"><table align=\"center\" width=\"100%\" style=\"margin:0 auto;max-width:600px;background-color:#FFFFFF\" role=\"presentation\" cellSpacing=\"0\" cellPadding=\"0\" border=\"0\"><tbody><tr style=\"width:100%\"><td><h2 style=\"font-weight:bold;margin:0;font-size:24px;padding:16px 24px 16px 24px\">Invoice #1042</h2><div style=\"padding:16px 24px 16px 24px\">Your October invoice is ready. Payment is due within 14 days.</div><div style=\"padding:8px 24px 8px 24px\"><hr style=\"width:100%;border:none;border-top:1px solid #E6E6E6;margin:0\"/></div><div style=\"padding:16px 24px 16px 24px\"><table align=\"center\" width=\"100%\" cellPadding=\"0\" border=\"0\" style=\"table-layout:fixed;border-collapse:collapse\"><tbody style=\"width:100%\"><tr style=\"width:100%\"><td style=\"box-sizing:content-box;vertical-align:middle;padding-left:0;padding-right:8px\"><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Pro plan — monthly</div><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Extra seats × 3</div></td><td style=\"box-sizing:content-box;vertical-align:middle;padding-left:8px;padding-right:0\"><div style=\"text-align:right;padding:16px 24px 16px 24px\">$49.00</div><div style=\"text-align:right;padding:16px 24px 16px 24px\">$27.00</div></td></tr></tbody></table></div><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Pro plan — monthly</div><div style=\"font-weight:bold;padding:16px 24px 16px 24px\">Extra seats × 3</div><div style=\"text-align:right;padding:16px 24px 16px 24px\">$49.00</div><div style=\"text-align:right;padding:16px 24px 16px 24px\">$27.00</div><div style=\"padding:8px 24px 8px 24px\"><hr style=\"width:100%;border:none;border-top:1px solid #E6E6E6;margin:0\"/></div><div style=\"font-weight:bold;text-align:right;padding:16px 24px 16px 24px\">Total due: $76.00</div><div style=\"padding:16px 24px 16px 24px\"><a href=\"https://example.com\" style=\"color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#999999;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none\" target=\"_blank\"><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30\" hidden>&nbsp;</i><![endif]--></span><span>Pay invoice</span><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%\" hidden>&nbsp;</i><![endif]--></span></a></div></td></tr></tbody></table></div></body></html>"
  },
  {
    "Id": "tpl_reset",
    "TemplateName": "Password reset",
    "Variant": "standard",
    "Subject": "Reset your password",
    "Category": "Transactional",
    "Accent": "#ea5455",
    "From": "security@yourbrand.com",
    "Status": "DRAFT",
    "UpdatedAt": "2026-01-15T11:10:00Z",
    "PreviewText": "Someone requested a password reset for your account.",
    "Document": {
      "root": {
        "type": "EmailLayout",
        "data": {
          "backdropColor": "#F5F5F5",
          "canvasColor": "#FFFFFF",
          "textColor": "#262626",
          "fontFamily": "MODERN_SANS",
          "childrenIds": [
            "r_av",
            "r_h",
            "r_t",
            "r_btn",
            "r_d",
            "r_f"
          ]
        }
      },
      "r_av": {
        "type": "Avatar",
        "data": {
          "props": {
            "imageUrl": "https://ui-avatars.com/api/?name=O&background=6C5CE7&color=fff&size=128",
            "shape": "circle"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "center"
          }
        }
      },
      "r_h": {
        "type": "Heading",
        "data": {
          "props": {
            "text": "Reset your password",
            "level": "h2"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "center"
          }
        }
      },
      "r_t": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Someone requested a password reset for your account. If that was you, use the button below — the link expires in 30 minutes."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "center"
          }
        }
      },
      "r_btn": {
        "type": "Button",
        "data": {
          "props": {
            "text": "Reset password",
            "url": "https://example.com/reset"
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "textAlign": "center"
          }
        }
      },
      "r_d": {
        "type": "Divider",
        "data": {
          "props": {
            "lineColor": "#E6E6E6"
          },
          "style": {
            "padding": {
              "top": 8,
              "bottom": 8,
              "left": 24,
              "right": 24
            }
          }
        }
      },
      "r_f": {
        "type": "Text",
        "data": {
          "props": {
            "text": "Didn't request this? You can safely ignore this email."
          },
          "style": {
            "padding": {
              "top": 16,
              "bottom": 16,
              "left": 24,
              "right": 24
            },
            "fontSize": 12,
            "color": "#8A8A95",
            "textAlign": "center"
          }
        }
      }
    },
    "Html": "<!DOCTYPE html><html><body><div style=\"background-color:#F5F5F5;color:#262626;font-family:&quot;Helvetica Neue&quot;, &quot;Arial Nova&quot;, &quot;Nimbus Sans&quot;, Arial, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%\"><table align=\"center\" width=\"100%\" style=\"margin:0 auto;max-width:600px;background-color:#FFFFFF\" role=\"presentation\" cellSpacing=\"0\" cellPadding=\"0\" border=\"0\"><tbody><tr style=\"width:100%\"><td><div style=\"text-align:center;padding:16px 24px 16px 24px\"><img alt=\"\" src=\"https://ui-avatars.com/api/?name=O&amp;background=6C5CE7&amp;color=fff&amp;size=128\" height=\"64\" width=\"64\" style=\"outline:none;border:none;text-decoration:none;object-fit:cover;height:64px;width:64px;max-width:100%;display:inline-block;vertical-align:middle;text-align:center;border-radius:64px\"/></div><h2 style=\"font-weight:bold;text-align:center;margin:0;font-size:24px;padding:16px 24px 16px 24px\">Reset your password</h2><div style=\"text-align:center;padding:16px 24px 16px 24px\">Someone requested a password reset for your account. If that was you, use the button below — the link expires in 30 minutes.</div><div style=\"text-align:center;padding:16px 24px 16px 24px\"><a href=\"https://example.com/reset\" style=\"color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#999999;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none\" target=\"_blank\"><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30\" hidden>&nbsp;</i><![endif]--></span><span>Reset password</span><span><!--[if mso]><i style=\"letter-spacing: 20px;mso-font-width:-100%\" hidden>&nbsp;</i><![endif]--></span></a></div><div style=\"padding:8px 24px 8px 24px\"><hr style=\"width:100%;border:none;border-top:1px solid #E6E6E6;margin:0\"/></div><div style=\"color:#8A8A95;font-size:12px;text-align:center;padding:16px 24px 16px 24px\">Didn&#x27;t request this? You can safely ignore this email.</div></td></tr></tbody></table></div></body></html>"
  }
];

export const getEmailTemplateById = (id) =>
  EMAIL_TEMPLATES.find((t) => String(t.Id) === String(id));

export const toBuilderListEntry = (t) => ({
  id: String(t.Id),
  name: t.TemplateName,
  updatedAt: t.UpdatedAt,
});
