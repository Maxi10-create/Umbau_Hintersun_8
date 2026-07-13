
/**
 * Umbau Hintersun 8 - Google Sheets Backend v2
 * Fertiges Backend fuer GitHub Pages Dashboard + mobile Eingabe.
 *
 * Schnellstart:
 * 1) Leeres Google Sheet erstellen.
 * 2) Erweiterungen > Apps Script > diese Datei einfuegen.
 * 3) setupWorkbookWithSeedData() einmal ausfuehren.
 * 4) setApiToken() ausfuehren und Token in docs/assets/js/config.js eintragen.
 * 5) Bereitstellen > Neue Bereitstellung > Web-App.
 */

const BACKEND_VERSION = '2.0.0';
const PROJECT_NAME = 'Umbau Hintersun 8';
const SHEET_ORDER = ["settings", "parties", "areas", "budget_estimates", "cost_positions", "offers", "offer_items", "payments", "financing", "bank_offers", "subsidies", "timeline_tasks", "trades", "companies", "bureaucracy", "technicians", "energy_inputs", "energy_results", "documents", "decisions", "cashflow", "audit_log"];
const SCHEMA = {
  "settings": [
    "key",
    "value",
    "unit",
    "source",
    "editable",
    "comment"
  ],
  "parties": [
    "party_id",
    "name",
    "unit",
    "role",
    "default_split",
    "equity_default",
    "subsidy_default",
    "notes"
  ],
  "areas": [
    "unit",
    "party",
    "real_area_m2",
    "virtual_area_m2",
    "thousandths",
    "source",
    "notes"
  ],
  "budget_estimates": [
    "estimate_id",
    "budget_block",
    "category",
    "version",
    "estimate_type",
    "amount_net",
    "vat_rate",
    "amount_gross",
    "is_baseline",
    "active",
    "share_w1",
    "share_w2",
    "date",
    "status",
    "source",
    "comment",
    "created_at",
    "updated_at"
  ],
  "cost_positions": [
    "cost_id",
    "category",
    "subcategory",
    "item",
    "supplier",
    "status",
    "source_type",
    "net",
    "vat_rate",
    "gross",
    "party_assignment",
    "split_key",
    "share_w1",
    "share_w2",
    "compare_group",
    "offer_id",
    "active",
    "final",
    "paid",
    "payment_due",
    "document_id",
    "risk",
    "source",
    "created_at",
    "updated_at"
  ],
  "offers": [
    "offer_id",
    "trade",
    "compare_group",
    "supplier",
    "date",
    "valid_until",
    "net",
    "vat_rate",
    "gross",
    "status",
    "final",
    "active",
    "party_assignment",
    "split_key",
    "share_w1",
    "share_w2",
    "score",
    "included",
    "excluded",
    "document_id",
    "comment",
    "created_at",
    "updated_at"
  ],
  "offer_items": [
    "offer_item_id",
    "offer_id",
    "position",
    "description",
    "quantity",
    "unit",
    "unit_price",
    "total_net",
    "comment"
  ],
  "payments": [
    "payment_id",
    "date",
    "supplier",
    "amount_gross",
    "paid_by",
    "related_cost_id",
    "status",
    "document_id",
    "comment",
    "created_at",
    "updated_at"
  ],
  "financing": [
    "finance_id",
    "party",
    "type",
    "amount",
    "interest_rate",
    "term_years",
    "status",
    "source",
    "comment",
    "created_at",
    "updated_at"
  ],
  "bank_offers": [
    "bank_offer_id",
    "bank",
    "contact",
    "date",
    "party",
    "amount",
    "interest_type",
    "interest_rate",
    "term_years",
    "monthly_rate",
    "status",
    "comment",
    "created_at",
    "updated_at"
  ],
  "subsidies": [
    "subsidy_id",
    "program",
    "party",
    "expected_amount",
    "confirmed_amount",
    "status",
    "deadline",
    "requirements",
    "comment",
    "created_at",
    "updated_at"
  ],
  "timeline_tasks": [
    "task_id",
    "phase",
    "workstream",
    "task",
    "owner",
    "start_date",
    "due_date",
    "status",
    "priority",
    "progress_weight",
    "depends_on",
    "blocks",
    "is_blocker",
    "linked_cost_id",
    "document_id",
    "comment",
    "created_at",
    "updated_at"
  ],
  "trades": [
    "trade_id",
    "trade",
    "priority",
    "owner",
    "target_request",
    "target_award",
    "status",
    "blocks_construction_start",
    "comment",
    "created_at",
    "updated_at"
  ],
  "companies": [
    "company_id",
    "trade_id",
    "company",
    "contact",
    "status",
    "offer_id",
    "final",
    "comment",
    "created_at",
    "updated_at"
  ],
  "bureaucracy": [
    "bureau_id",
    "area",
    "task",
    "owner",
    "status",
    "deadline",
    "priority",
    "blocks",
    "document_id",
    "comment"
  ],
  "technicians": [
    "tech_id",
    "name",
    "role",
    "status",
    "cost_id",
    "included",
    "excluded",
    "contact",
    "comment"
  ],
  "energy_inputs": [
    "input_id",
    "module",
    "name",
    "value",
    "unit",
    "editable",
    "source",
    "comment",
    "created_at",
    "updated_at"
  ],
  "energy_results": [
    "scenario",
    "pv_kwp",
    "battery_kwh",
    "heat_pump_kw",
    "pellet_active",
    "grid_kwh",
    "pellet_kg",
    "autarky_percent",
    "annual_energy_cost",
    "comment"
  ],
  "documents": [
    "document_id",
    "category",
    "title",
    "date",
    "status",
    "file_url",
    "source_note"
  ],
  "decisions": [
    "decision_id",
    "area",
    "decision",
    "options",
    "recommendation",
    "status",
    "priority",
    "deadline",
    "depends_on",
    "cost_impact",
    "energy_impact",
    "comment",
    "created_at",
    "updated_at"
  ],
  "cashflow": [
    "cashflow_id",
    "date",
    "phase",
    "party",
    "category",
    "expected_outflow",
    "expected_inflow",
    "funding_source",
    "status",
    "linked_cost_id",
    "comment"
  ],
  "audit_log": [
    "log_id",
    "timestamp",
    "user",
    "action",
    "sheet",
    "row_id",
    "details"
  ]
};
const SEED_DATA = {
  "settings": [
    {
      "key": "project_name",
      "value": "Umbau Hintersun 8",
      "unit": "",
      "source": "Projektvorgabe",
      "editable": "FALSE",
      "comment": "Name fuer Dashboard und GitHub-Projekt"
    },
    {
      "key": "project_start",
      "value": "2025-07-30",
      "unit": "date",
      "source": "Status_Architekt_20260711.pdf",
      "editable": "TRUE",
      "comment": "Erstbesprechung Architekt"
    },
    {
      "key": "target_construction_start",
      "value": "2026-09-01",
      "unit": "date",
      "source": "Status_Architekt_20260711.pdf",
      "editable": "TRUE",
      "comment": "Vorlaeufiger Baubeginn September 2026, im Dashboard setzbar"
    },
    {
      "key": "target_first_occupancy",
      "value": "2027-06-30",
      "unit": "date",
      "source": "Annahme",
      "editable": "TRUE",
      "comment": "Erster Bezug/Fertigstellung frei setzbar"
    },
    {
      "key": "construction_start_status",
      "value": "vorlaeufig",
      "unit": "",
      "source": "Annahme",
      "editable": "TRUE",
      "comment": "noch nicht bestaetigt"
    },
    {
      "key": "vat_rate_default",
      "value": "22",
      "unit": "%",
      "source": "Annahme Italien",
      "editable": "TRUE",
      "comment": "Default MwSt."
    },
    {
      "key": "contingency_rate",
      "value": "12",
      "unit": "%",
      "source": "Annahme",
      "editable": "TRUE",
      "comment": "Reserve fuer offene Kosten"
    },
    {
      "key": "thousandths_w1",
      "value": "466",
      "unit": "/1000",
      "source": "Tausendstelltabelle 04.06.2026",
      "editable": "FALSE",
      "comment": "W1/Ingrid"
    },
    {
      "key": "thousandths_w2",
      "value": "534",
      "unit": "/1000",
      "source": "Tausendstelltabelle 04.06.2026",
      "editable": "FALSE",
      "comment": "W2/Maximilian"
    },
    {
      "key": "area_w1",
      "value": "81",
      "unit": "m2",
      "source": "Einreichplanung",
      "editable": "FALSE",
      "comment": "Wohnung W1"
    },
    {
      "key": "area_w2",
      "value": "95",
      "unit": "m2",
      "source": "Einreichplanung",
      "editable": "FALSE",
      "comment": "Wohnung W2"
    },
    {
      "key": "gross_volume",
      "value": "694.82",
      "unit": "m3",
      "source": "Einreichplanung/Kubatur",
      "editable": "FALSE",
      "comment": "oberirdische Kubatur Endstand"
    },
    {
      "key": "building_height_mean",
      "value": "8.98",
      "unit": "m",
      "source": "Einreichplanung/Kubatur",
      "editable": "FALSE",
      "comment": "mittlere Gebaeudehoehe"
    },
    {
      "key": "latitude",
      "value": "46.754",
      "unit": "deg",
      "source": "PVGIS/Sonnenstandort",
      "editable": "FALSE",
      "comment": "Natz/Hintersun"
    },
    {
      "key": "longitude",
      "value": "11.678",
      "unit": "deg",
      "source": "PVGIS/Sonnenstandort",
      "editable": "FALSE",
      "comment": "Natz/Hintersun"
    },
    {
      "key": "altitude",
      "value": "897",
      "unit": "m",
      "source": "Sonnenstandort Screenshot",
      "editable": "FALSE",
      "comment": "Hoehe am Standort"
    },
    {
      "key": "pvgis_yield_per_kwp",
      "value": "1296.61",
      "unit": "kWh/kWp/a",
      "source": "PVGIS 1kWp Bericht",
      "editable": "FALSE",
      "comment": "PVGIS-SARAH3, berechneter Horizont, 14% Systemverlust"
    },
    {
      "key": "pvgis_tilt_opt",
      "value": "42",
      "unit": "deg",
      "source": "PVGIS 1kWp Bericht",
      "editable": "FALSE",
      "comment": "optimale Neigung"
    },
    {
      "key": "pvgis_azimuth_opt",
      "value": "-4",
      "unit": "deg",
      "source": "PVGIS 1kWp Bericht",
      "editable": "FALSE",
      "comment": "PVGIS Azimut opt."
    },
    {
      "key": "pv_roof_gross_sw",
      "value": "42",
      "unit": "m2",
      "source": "Arbeitsannahme aus Plan/Dach",
      "editable": "TRUE",
      "comment": "Brutto SW-Giebeldach; final aus CAD pruefen"
    },
    {
      "key": "pv_roof_deduction_obstacles",
      "value": "10",
      "unit": "m2",
      "source": "Dachfenster/Rand/Hindernisse",
      "editable": "TRUE",
      "comment": "Dachfenster, Randabstand, Wartung, Hindernisse"
    },
    {
      "key": "pv_power_density",
      "value": "0.225",
      "unit": "kWp/m2",
      "source": "Annahme 450Wp/2m2",
      "editable": "TRUE",
      "comment": "Leistungsdichte moderner Module"
    },
    {
      "key": "pv_system_loss",
      "value": "14",
      "unit": "%",
      "source": "PVGIS Bericht",
      "editable": "TRUE",
      "comment": "Systemverluste"
    },
    {
      "key": "alperia_energy_price",
      "value": "0.10494",
      "unit": "EUR/kWh",
      "source": "Strom_Alperia_Doc.pdf",
      "editable": "TRUE",
      "comment": "Energiepreis Anteil laut Mail/Vertrag"
    },
    {
      "key": "alperia_fixed_fee",
      "value": "86.20",
      "unit": "EUR/a",
      "source": "Strom_Alperia_Doc.pdf",
      "editable": "TRUE",
      "comment": "reduzierte fixe CVS-Gebuehr"
    },
    {
      "key": "grid_price_all_in",
      "value": "0.30",
      "unit": "EUR/kWh",
      "source": "Annahme",
      "editable": "TRUE",
      "comment": "effektiver Netzstrompreis fuer PV-Wirtschaftlichkeit"
    },
    {
      "key": "current_annual_electricity_cost",
      "value": "1279.06",
      "unit": "EUR/a",
      "source": "Strom_Alperia_Doc.pdf/Notiz",
      "editable": "TRUE",
      "comment": "aktueller Jahresbetrag laut Notiz"
    },
    {
      "key": "pellet_boiler_model",
      "value": "Guntamatic THERM 10 Flex",
      "unit": "",
      "source": "Pelletsanlage_Doc.pdf",
      "editable": "FALSE",
      "comment": "Bestandsanlage"
    },
    {
      "key": "pellet_install_year",
      "value": "2013",
      "unit": "year",
      "source": "Pelletsanlage_Doc.pdf",
      "editable": "FALSE",
      "comment": "Anlage ca. 13 Jahre alt in 2026"
    },
    {
      "key": "pellet_boiler_power",
      "value": "10.2",
      "unit": "kW_th",
      "source": "Pelletsanlage_Doc.pdf",
      "editable": "FALSE",
      "comment": "Nennleistung"
    },
    {
      "key": "pellet_efficiency",
      "value": "92.8",
      "unit": "%",
      "source": "Pelletsanlage_Doc.pdf",
      "editable": "FALSE",
      "comment": "Kesselwirkungsgrad"
    },
    {
      "key": "pellet_heating_value",
      "value": "4.8",
      "unit": "kWh/kg",
      "source": "Annahme Standard Pellets",
      "editable": "TRUE",
      "comment": "Heizwert fuer kg-Berechnung"
    },
    {
      "key": "pellet_aux_power",
      "value": "200",
      "unit": "kWh/a",
      "source": "Annahme",
      "editable": "TRUE",
      "comment": "Hilfsstrom Pelletanlage"
    },
    {
      "key": "climate_zone",
      "value": "F",
      "unit": "",
      "source": "Pelletsanlage_Doc.pdf",
      "editable": "FALSE",
      "comment": "Klimazone"
    },
    {
      "key": "heating_degree_days",
      "value": "3637",
      "unit": "HDD",
      "source": "Pelletsanlage_Doc.pdf",
      "editable": "FALSE",
      "comment": "Gradi giorno"
    },
    {
      "key": "design_outdoor_temp",
      "value": "-18",
      "unit": "C",
      "source": "Pelletsanlage_Doc.pdf",
      "editable": "FALSE",
      "comment": "Auslegungs-Aussentemperatur"
    },
    {
      "key": "heat_pump_default_kw",
      "value": "8.5",
      "unit": "kW",
      "source": "Dashboard-Optimum Arbeitsannahme",
      "editable": "TRUE",
      "comment": "WP Default 5-12kW"
    },
    {
      "key": "heat_pump_flow_temp",
      "value": "38",
      "unit": "C",
      "source": "Annahme",
      "editable": "TRUE",
      "comment": "Vorlauftemperatur"
    },
    {
      "key": "battery_default_kwh",
      "value": "12",
      "unit": "kWh",
      "source": "Dashboard-Empfehlung",
      "editable": "TRUE",
      "comment": "sinnvoller Startbereich 10-14kWh"
    }
  ],
  "parties": [
    {
      "party_id": "P001",
      "name": "Ingrid Harder",
      "unit": "W1",
      "role": "Bauherrin / Wohnung A",
      "default_split": "466",
      "equity_default": "50000",
      "subsidy_default": "40000",
      "notes": "W1 / 466 Tausendstel"
    },
    {
      "party_id": "P002",
      "name": "Maximilian Hofer",
      "unit": "W2",
      "role": "Wohnung B / Projektkoordination",
      "default_split": "534",
      "equity_default": "70000",
      "subsidy_default": "28000",
      "notes": "W2 / 534 Tausendstel, Zugang zinsbeguenstigtes Darlehen pruefen"
    }
  ],
  "areas": [
    {
      "unit": "W1",
      "party": "Ingrid Harder",
      "real_area_m2": "81",
      "virtual_area_m2": "90.25",
      "thousandths": "466",
      "source": "Tausendstelltabelle signed 04.06.2026",
      "notes": "Keller anteilig mit Faktor 0.3"
    },
    {
      "unit": "W2",
      "party": "Maximilian Hofer",
      "real_area_m2": "95",
      "virtual_area_m2": "103.57",
      "thousandths": "534",
      "source": "Tausendstelltabelle signed 04.06.2026",
      "notes": "Keller anteilig mit Faktor 0.3"
    }
  ],
  "cost_positions": [
    {
      "cost_id": "C-ARCH-001",
      "category": "Techniker",
      "subcategory": "Architekt",
      "item": "Planungsauftrag Klement Architects",
      "supplier": "Klement Architects",
      "status": "beauftragt",
      "source_type": "Auftrag",
      "net": "36000",
      "vat_rate": "22",
      "gross": "45676.80",
      "party_assignment": "gemeinsam",
      "split_key": "thousandths_466_534",
      "final": "TRUE",
      "paid": "partly",
      "payment_due": "phasenweise",
      "document_id": "DOC-ARCH-001",
      "risk": "Statik, SiGeKo, Klimahaus, ENEA, Haustechnik nicht enthalten"
    },
    {
      "cost_id": "C-STAT-001",
      "category": "Techniker",
      "subcategory": "Statik",
      "item": "Statik Manuel Troger",
      "supplier": "Manuel Troger",
      "status": "Angebot/ok",
      "source_type": "Notiz",
      "net": "3700",
      "vat_rate": "22",
      "gross": "4514",
      "party_assignment": "gemeinsam",
      "split_key": "thousandths_466_534",
      "final": "FALSE",
      "paid": "FALSE",
      "payment_due": "offen",
      "document_id": "DOC-STATUS-ARCH",
      "risk": "Leistung/Abrechnung final pruefen"
    },
    {
      "cost_id": "C-PSP-001",
      "category": "Buerokratie",
      "subcategory": "Steuerberatung",
      "item": "PSP Beratung erste Rechnung",
      "supplier": "PSP STP GmbH",
      "status": "bezahlt",
      "source_type": "Rechnung/Notiz",
      "net": "208",
      "vat_rate": "22",
      "gross": "253.76",
      "party_assignment": "projekt",
      "split_key": "manual",
      "final": "TRUE",
      "paid": "TRUE",
      "payment_due": "2026-04-27",
      "document_id": "DOC-PSP-001",
      "risk": "weitere Beratung optional"
    },
    {
      "cost_id": "C-GEM-001",
      "category": "Buerokratie",
      "subcategory": "Gemeinde",
      "item": "Sekretariatsgebuehren Durchfuehrungsplan",
      "supplier": "Gemeinde Natz-Schabs",
      "status": "bezahlt",
      "source_type": "Zahlung",
      "net": "100",
      "vat_rate": "0",
      "gross": "100",
      "party_assignment": "projekt",
      "split_key": "manual",
      "final": "TRUE",
      "paid": "TRUE",
      "payment_due": "2026-02-24",
      "document_id": "DOC-STATUS-ARCH",
      "risk": ""
    },
    {
      "cost_id": "C-GEM-002",
      "category": "Buerokratie",
      "subcategory": "Gemeinde",
      "item": "Sekretariatsgebuehren Einreichprojekt",
      "supplier": "Gemeinde Natz-Schabs",
      "status": "bezahlt/vorgemerkt",
      "source_type": "Zahlung",
      "net": "250",
      "vat_rate": "0",
      "gross": "250",
      "party_assignment": "projekt",
      "split_key": "manual",
      "final": "TRUE",
      "paid": "TRUE",
      "payment_due": "2026-03-10",
      "document_id": "DOC-STATUS-ARCH",
      "risk": ""
    },
    {
      "cost_id": "C-KUE-RESCH",
      "category": "Innenausbau",
      "subcategory": "Kueche",
      "item": "Kueche Resch Angebot TS 26_123",
      "supplier": "Resch Möbel GmbH",
      "status": "Angebot erhalten",
      "source_type": "Angebot",
      "net": "22442",
      "vat_rate": "22",
      "gross": "27378",
      "party_assignment": "W2",
      "split_key": "100_w2",
      "final": "FALSE",
      "paid": "FALSE",
      "payment_due": "offen",
      "document_id": "DOC-KUE-RESCH",
      "risk": "Maurer/Hydrauliker/Elektriker nicht enthalten"
    },
    {
      "cost_id": "C-KUE-STAMPFL",
      "category": "Innenausbau",
      "subcategory": "Kueche",
      "item": "Kuecheneinrichtung Stampfl",
      "supplier": "Stampfl Küche & Wohnen",
      "status": "Angebot erhalten",
      "source_type": "Angebot",
      "net": "25900",
      "vat_rate": "22",
      "gross": "31598",
      "party_assignment": "W2",
      "split_key": "100_w2",
      "final": "FALSE",
      "paid": "FALSE",
      "payment_due": "offen",
      "document_id": "DOC-KUE-STAMPFL",
      "risk": "MwSt, Wasseranschluss, Beleuchtung, Gipskarton nicht enthalten"
    },
    {
      "cost_id": "C-SIGEKO-001",
      "category": "Techniker",
      "subcategory": "Sicherheitskoordination",
      "item": "Sicherheitskoordination vor Baubeginn",
      "supplier": "offen",
      "status": "offen",
      "source_type": "offen",
      "net": "0",
      "vat_rate": "22",
      "gross": "0",
      "party_assignment": "gemeinsam",
      "split_key": "thousandths_466_534",
      "final": "FALSE",
      "paid": "FALSE",
      "payment_due": "vor Baubeginn",
      "document_id": "DOC-STATUS-ARCH",
      "risk": "kritisch fuer Baustart"
    },
    {
      "cost_id": "C-BLITZ-001",
      "category": "Techniker",
      "subcategory": "Blitzschutz",
      "item": "Blitzschutzberechnung Elektrotechniker",
      "supplier": "offen",
      "status": "offen",
      "source_type": "Schaetzung",
      "net": "350",
      "vat_rate": "22",
      "gross": "427",
      "party_assignment": "gemeinsam",
      "split_key": "thousandths_466_534",
      "final": "FALSE",
      "paid": "FALSE",
      "payment_due": "vor Baukonzession",
      "document_id": "DOC-STATUS-ARCH",
      "risk": "benoetigt fuer Baukonzession laut Notiz"
    }
  ],
  "offers": [
    {
      "offer_id": "OFF-RESCH-20260522",
      "trade": "Kueche",
      "supplier": "Resch Möbel GmbH",
      "date": "2026-05-22",
      "valid_until": "2026-06-21",
      "net": "22442",
      "vat_rate": "22",
      "gross": "27378",
      "status": "Angebot erhalten",
      "final": "FALSE",
      "party_assignment": "W2",
      "score": "82",
      "included": "Lieferung, Montage",
      "excluded": "Maurer, Hydrauliker, Elektriker, nicht explizit angebotene Arbeiten",
      "document_id": "DOC-KUE-RESCH",
      "comment": "Keramik Arbeitsplatte, NEFF/Bora laut Angebot"
    },
    {
      "offer_id": "OFF-STAMPFL-20260320",
      "trade": "Kueche",
      "supplier": "Stampfl Küche & Wohnen",
      "date": "2026-03-20",
      "valid_until": "2026-04-19",
      "net": "25900",
      "vat_rate": "22",
      "gross": "31598",
      "status": "Angebot erhalten",
      "final": "FALSE",
      "party_assignment": "W2",
      "score": "78",
      "included": "Lieferung, Montage, Massabnahme, Detailplaene, Installationsplaene",
      "excluded": "MwSt, Wasseranschluss, Wasserhahn, Beleuchtung, evtl. Gipskarton",
      "document_id": "DOC-KUE-STAMPFL",
      "comment": "Quarzit, Miele, Bora PURA2"
    },
    {
      "offer_id": "OFF-KLEMENT-20260312",
      "trade": "Architektur",
      "supplier": "Klement Architects",
      "date": "2026-03-12",
      "valid_until": "",
      "net": "36000",
      "vat_rate": "22",
      "gross": "45676.80",
      "status": "beauftragt",
      "final": "TRUE",
      "party_assignment": "gemeinsam",
      "score": "90",
      "included": "Planung, Einreichung, Ausfuehrung, Ausschreibung, Bauleitung, Abnahme laut Auftrag",
      "excluded": "Statik, SiGeKo, Klimahaus, ENEA, Haustechnikplanung",
      "document_id": "DOC-ARCH-001",
      "comment": "Skontiertes Honorar inkl. Nebenkosten + 4% Gesundheitssteuer + MwSt"
    },
    {
      "offer_id": "OFF-PSP-20260316",
      "trade": "Steuerberatung",
      "supplier": "PSP STP GmbH",
      "date": "2026-03-16",
      "valid_until": "2026-04-05",
      "net": "800",
      "vat_rate": "22",
      "gross": "976",
      "status": "teilweise genutzt",
      "final": "FALSE",
      "party_assignment": "projekt",
      "score": "70",
      "included": "Beratung, Mindesthonorar 800 EUR",
      "excluded": "2% Erfolgs-/Zusatzhonorar, Steuererklaerung 500 EUR, Leihvertrag 210 EUR",
      "document_id": "DOC-PSP-001",
      "comment": "erste Rechnung 253,76 EUR laut Notiz bezahlt"
    }
  ],
  "payments": [
    {
      "payment_id": "PAY-GEM-20260224",
      "date": "2026-02-24",
      "supplier": "Gemeinde Natz-Schabs",
      "amount_gross": "100",
      "paid_by": "Maximilian Hofer",
      "related_cost_id": "C-GEM-001",
      "status": "bezahlt",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "Durchfuehrungsplan Sekretariatsgebuehren"
    },
    {
      "payment_id": "PAY-GEM-20260310",
      "date": "2026-03-10",
      "supplier": "Gemeinde Natz-Schabs",
      "amount_gross": "250",
      "paid_by": "Maximilian Hofer",
      "related_cost_id": "C-GEM-002",
      "status": "bezahlt/vorgemerkt",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "Einreichprojekt Sekretariatsgebuehren"
    },
    {
      "payment_id": "PAY-PSP-20260427",
      "date": "2026-04-27",
      "supplier": "PSP STP GmbH",
      "amount_gross": "253.76",
      "paid_by": "Ingrid Harder",
      "related_cost_id": "C-PSP-001",
      "status": "bezahlt",
      "document_id": "DOC-STATUS-BUER",
      "comment": "erste PSP Rechnung"
    },
    {
      "payment_id": "PAY-ARCH-20260427",
      "date": "2026-04-27",
      "supplier": "Klement Architects",
      "amount_gross": "22208.25",
      "paid_by": "Ingrid Harder",
      "related_cost_id": "C-ARCH-001",
      "status": "bezahlt/Pruefen",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "erste Honorarzahlung laut Statusnotiz, Betrag bitte pruefen"
    }
  ],
  "financing": [
    {
      "finance_id": "FIN-W1-COST",
      "party": "Ingrid Harder / W1",
      "type": "Grobkosten",
      "amount": "160000",
      "interest_rate": "0",
      "term_years": "0",
      "status": "Arbeitsannahme",
      "source": "Status_Buero(kratie)_20260711.pdf",
      "comment": "vorlaeufige Grobkosten"
    },
    {
      "finance_id": "FIN-W2-COST",
      "party": "Maximilian Hofer / W2",
      "type": "Grobkosten",
      "amount": "460000",
      "interest_rate": "0",
      "term_years": "0",
      "status": "Arbeitsannahme",
      "source": "Status_Buero(kratie)_20260711.pdf",
      "comment": "vorlaeufige Grobkosten"
    },
    {
      "finance_id": "FIN-W1-EK",
      "party": "Ingrid Harder / W1",
      "type": "Eigenkapital",
      "amount": "50000",
      "interest_rate": "0",
      "term_years": "0",
      "status": "geplant",
      "source": "Status_Buero(kratie)_20260711.pdf",
      "comment": ""
    },
    {
      "finance_id": "FIN-W2-EK",
      "party": "Maximilian Hofer / W2",
      "type": "Eigenkapital",
      "amount": "70000",
      "interest_rate": "0",
      "term_years": "0",
      "status": "geplant",
      "source": "Status_Buero(kratie)_20260711.pdf",
      "comment": ""
    },
    {
      "finance_id": "FIN-W1-SUB",
      "party": "Ingrid Harder / W1",
      "type": "Landesfoerderung",
      "amount": "40000",
      "interest_rate": "0",
      "term_years": "0",
      "status": "erwartet",
      "source": "Status_Buero(kratie)_20260711.pdf",
      "comment": "Foerderung noch nicht gesichert"
    },
    {
      "finance_id": "FIN-W2-SUB",
      "party": "Maximilian Hofer / W2",
      "type": "Landesfoerderung",
      "amount": "28000",
      "interest_rate": "0",
      "term_years": "0",
      "status": "erwartet",
      "source": "Status_Buero(kratie)_20260711.pdf",
      "comment": "bei Wohnsitzverlegung ggf. anders"
    },
    {
      "finance_id": "FIN-ZDL",
      "party": "Maximilian Hofer / W2",
      "type": "Zinsbeguenstigtes Darlehen",
      "amount": "250000",
      "interest_rate": "2.75",
      "term_years": "25",
      "status": "offen",
      "source": "Status_Buero(kratie)_20260711.pdf",
      "comment": "bis 250.000 EUR, var. 2,75%, fix 4%, Rueckverguetung bis 2.400 EUR/a fuer 10 Jahre laut Notiz"
    },
    {
      "finance_id": "FIN-REST",
      "party": "Projekt",
      "type": "Bankkredit normal / Restbedarf",
      "amount": "182000",
      "interest_rate": "4.0",
      "term_years": "25",
      "status": "offen",
      "source": "Berechnung aus Grobkosten",
      "comment": "Restlicher Kreditbedarf nach ZDL Arbeitsannahme"
    }
  ],
  "bank_offers": [
    {
      "bank_offer_id": "BANK-VB-20260503",
      "bank": "Volksbank",
      "contact": "Katja Gasser",
      "date": "2026-05-03",
      "party": "beide",
      "amount": "",
      "interest_type": "offen",
      "interest_rate": "",
      "term_years": "",
      "monthly_rate": "",
      "status": "angefragt",
      "comment": "Kreditangebot beide"
    },
    {
      "bank_offer_id": "BANK-RAIKA-20260511",
      "bank": "Raiffeisenkasse",
      "contact": "Christoph Noessing",
      "date": "2026-05-11",
      "party": "Maximilian Hofer",
      "amount": "250000",
      "interest_type": "zinsbeguenstigt variabel",
      "interest_rate": "2.75",
      "term_years": "25",
      "monthly_rate": "",
      "status": "angefragt",
      "comment": "Landesgesetz/ZDL laut Notiz"
    },
    {
      "bank_offer_id": "ZDL-SUEDTIROL",
      "bank": "Land Südtirol / ZDL",
      "contact": "Wohnbauamt",
      "date": "",
      "party": "Maximilian Hofer",
      "amount": "250000",
      "interest_type": "variabel/fix",
      "interest_rate": "2.75 / 4.00",
      "term_years": "einstellbar",
      "monthly_rate": "berechnet",
      "status": "offen",
      "comment": "bis 2.400 EUR/a Rueckverguetung fuer 10 Jahre laut Notiz"
    }
  ],
  "subsidies": [
    {
      "subsidy_id": "SUB-W1-INGRID",
      "program": "Landesfoerderung",
      "party": "Ingrid Harder",
      "expected_amount": "40000",
      "confirmed_amount": "0",
      "status": "offen",
      "deadline": "",
      "requirements": "EEVE, Baukonzession, Verpflichtungserklaerung, Unterlagen",
      "comment": "kein ZDL laut Notiz"
    },
    {
      "subsidy_id": "SUB-W2-MAX",
      "program": "Landesfoerderung",
      "party": "Maximilian Hofer",
      "expected_amount": "28000",
      "confirmed_amount": "0",
      "status": "offen",
      "deadline": "",
      "requirements": "Wohnsitz/EEVE/Unterlagen",
      "comment": "21.800 bis 28.000 je Wohnsitzverlegung laut Notiz"
    },
    {
      "subsidy_id": "SUB-ZDL",
      "program": "Zinsbeguenstigtes Darlehen",
      "party": "Maximilian Hofer",
      "expected_amount": "250000",
      "confirmed_amount": "0",
      "status": "offen",
      "deadline": "",
      "requirements": "Wohnbauförderung/Bauk. Unterlagen",
      "comment": "bis 250k, 2.75%/4%, Rueckverguetung bis 2400 EUR/a"
    }
  ],
  "timeline_tasks": [
    {
      "task_id": "T-ARCH-START",
      "phase": "Grundlagen",
      "workstream": "Architekt",
      "task": "Erstbesprechung Architekt",
      "owner": "alle",
      "start_date": "2025-07-30",
      "due_date": "2025-07-30",
      "status": "erledigt",
      "priority": "mittel",
      "progress_weight": "2",
      "depends_on": "",
      "blocks": "",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "Projektstart"
    },
    {
      "task_id": "T-DP-EINREICH",
      "phase": "Buerokratie",
      "workstream": "Durchfuehrungsplan",
      "task": "Durchfuehrungsplan einreichen",
      "owner": "Architekt/Bauherr",
      "start_date": "2026-02-24",
      "due_date": "2026-02-24",
      "status": "erledigt",
      "priority": "hoch",
      "progress_weight": "4",
      "depends_on": "",
      "blocks": "",
      "linked_cost_id": "C-GEM-001",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "100 EUR bezahlt"
    },
    {
      "task_id": "T-EINREICH",
      "phase": "Buerokratie",
      "workstream": "Einreichprojekt",
      "task": "Einreichprojekt abgeben",
      "owner": "Architekt",
      "start_date": "2026-03-04",
      "due_date": "2026-03-24",
      "status": "erledigt",
      "priority": "hoch",
      "progress_weight": "5",
      "depends_on": "T-DP-EINREICH",
      "blocks": "Baukonzession",
      "linked_cost_id": "C-GEM-002",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "Einreichprojekt abgegeben 24.03.2026"
    },
    {
      "task_id": "T-UNBED",
      "phase": "Buerokratie",
      "workstream": "Gemeinde/Provinz",
      "task": "Unbedenklichkeitserklaerung erhalten",
      "owner": "Gemeinde/Provinz/Notarin",
      "start_date": "2026-06-12",
      "due_date": "2026-07-13",
      "status": "wartet auf Dritte",
      "priority": "kritisch",
      "progress_weight": "7",
      "depends_on": "",
      "blocks": "Notar, Schenkung, Verpflichtungserklaerung, Foerderantrag",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-BUER",
      "comment": "Blockiert Notartermin"
    },
    {
      "task_id": "T-EEVE-I",
      "phase": "Buerokratie",
      "workstream": "EEVE",
      "task": "EEVE 2025 Ingrid",
      "owner": "Ingrid Harder",
      "start_date": "2026-07-02",
      "due_date": "2026-07-02",
      "status": "offen/pruefen",
      "priority": "hoch",
      "progress_weight": "3",
      "depends_on": "",
      "blocks": "Foerderantrag",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-BUER",
      "comment": "Termin laut Notiz"
    },
    {
      "task_id": "T-EEVE-M",
      "phase": "Buerokratie",
      "workstream": "EEVE",
      "task": "EEVE 2025 Maximilian",
      "owner": "Maximilian Hofer",
      "start_date": "2026-07-13",
      "due_date": "2026-07-13",
      "status": "offen/pruefen",
      "priority": "hoch",
      "progress_weight": "3",
      "depends_on": "",
      "blocks": "Foerderantrag",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-BUER",
      "comment": "Termin laut Notiz"
    },
    {
      "task_id": "T-NOTAR",
      "phase": "Buerokratie",
      "workstream": "Notar",
      "task": "Schenkung + Verpflichtungserklaerung unterzeichnen",
      "owner": "Notarin/Parteien",
      "start_date": "2026-07-13",
      "due_date": "2026-07-31",
      "status": "blockiert",
      "priority": "kritisch",
      "progress_weight": "8",
      "depends_on": "T-UNBED",
      "blocks": "Foerderantrag, Umschreibung Baukonzession",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-BUER",
      "comment": "ab 13. Juli geplant"
    },
    {
      "task_id": "T-FOERD",
      "phase": "Foerderung",
      "workstream": "Wohnbaufoerderung",
      "task": "Antrag Wohnbaufoerderung einreichen",
      "owner": "Maximilian/Ingrid",
      "start_date": "2026-07-15",
      "due_date": "2026-08-15",
      "status": "offen",
      "priority": "kritisch",
      "progress_weight": "8",
      "depends_on": "T-NOTAR,T-EEVE-I,T-EEVE-M",
      "blocks": "Baustart 30 Tage Wartefrist",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-BUER",
      "comment": "ab Mitte Juli laut Notiz"
    },
    {
      "task_id": "T-WAIT30",
      "phase": "Foerderung",
      "workstream": "Wohnbaufoerderung",
      "task": "30 Tage Wartefrist vor Baustart",
      "owner": "Projekt",
      "start_date": "2026-08-15",
      "due_date": "2026-09-15",
      "status": "offen",
      "priority": "kritisch",
      "progress_weight": "5",
      "depends_on": "T-FOERD",
      "blocks": "Baubeginn",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-BUER",
      "comment": "Nach Antrag/Genehmigung 30 Tage warten laut Notiz"
    },
    {
      "task_id": "T-SIGEKO",
      "phase": "Planung",
      "workstream": "Sicherheit",
      "task": "Sicherheitskoordination beauftragen",
      "owner": "Bauherr/Architekt",
      "start_date": "2026-06-08",
      "due_date": "2026-08-15",
      "status": "offen",
      "priority": "kritisch",
      "progress_weight": "6",
      "depends_on": "",
      "blocks": "Baubeginn",
      "linked_cost_id": "C-SIGEKO-001",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "gesetzlich erforderlich vor Baubeginn"
    },
    {
      "task_id": "T-BAU-AUSS",
      "phase": "Ausschreibung",
      "workstream": "Baumeister",
      "task": "Baumeister Ausschreibung anfragen",
      "owner": "Architekt/Bauherr",
      "start_date": "2026-06-08",
      "due_date": "2026-08-01",
      "status": "offen",
      "priority": "kritisch",
      "progress_weight": "6",
      "depends_on": "",
      "blocks": "Baubeginn/Kostenplan",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "Felderer, Widmann, Arnold, Salcher"
    },
    {
      "task_id": "T-HLS-AUSS",
      "phase": "Ausschreibung",
      "workstream": "Hydrauliker/Heizung",
      "task": "Hydrauliker und HLS-Konzept anfragen",
      "owner": "Bauherr/Architekt",
      "start_date": "2026-06-08",
      "due_date": "2026-08-01",
      "status": "offen",
      "priority": "kritisch",
      "progress_weight": "6",
      "depends_on": "",
      "blocks": "WP/Pellet/PV/Elektroplanung",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "Thaler, Heizlast, Lueftung, Sanitaer"
    },
    {
      "task_id": "T-ELT-AUSS",
      "phase": "Ausschreibung",
      "workstream": "Elektriker",
      "task": "Elektriker/PV/Batterie/Wallbox Konzept anfragen",
      "owner": "Bauherr/Architekt",
      "start_date": "2026-06-08",
      "due_date": "2026-08-01",
      "status": "offen",
      "priority": "kritisch",
      "progress_weight": "6",
      "depends_on": "",
      "blocks": "PV/Batterie/WP/KNX Entscheidung",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "Stampfl Brunner"
    },
    {
      "task_id": "T-BAUBEGINN",
      "phase": "Bau",
      "workstream": "Baubeginn",
      "task": "Baubeginn",
      "owner": "Projekt",
      "start_date": "2026-09-01",
      "due_date": "2026-09-01",
      "status": "Zieltermin vorlaeufig",
      "priority": "kritisch",
      "progress_weight": "10",
      "depends_on": "T-WAIT30,T-SIGEKO,T-BAU-AUSS",
      "blocks": "Bauphase",
      "linked_cost_id": "",
      "document_id": "DOC-STATUS-ARCH",
      "comment": "September 2026 als vorlaeufiges Ziel"
    }
  ],
  "trades": [
    {
      "trade_id": "TR-SIGEKO",
      "trade": "Sicherheitskoordination",
      "priority": "kritisch",
      "owner": "Bauherr/Architekt",
      "target_request": "sofort",
      "target_award": "vor Baubeginn",
      "status": "offen",
      "blocks_construction_start": "TRUE",
      "comment": "gesetzlich erforderlich vor Baubeginn"
    },
    {
      "trade_id": "TR-BAU",
      "trade": "Baumeister/Maurer",
      "priority": "kritisch",
      "owner": "Architekt/Bauherr",
      "target_request": "sofort",
      "target_award": "vor September",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "TRUE",
      "comment": "Hauptgewerk"
    },
    {
      "trade_id": "TR-FEN",
      "trade": "Fenster",
      "priority": "hoch",
      "owner": "Architekt/Bauherr",
      "target_request": "bald",
      "target_award": "vor Ausfuehrung Huelle",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "FALSE",
      "comment": "EG-Fenster/Klimahaus/Zero-Verglasung/Raffstores klaeren"
    },
    {
      "trade_id": "TR-ZIM",
      "trade": "Zimmerer",
      "priority": "hoch",
      "owner": "Architekt/Bauherr",
      "target_request": "bald",
      "target_award": "vor Dachphase",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "FALSE",
      "comment": "Dachfenster mit Verschattungsrollos"
    },
    {
      "trade_id": "TR-SPEN",
      "trade": "Spengler",
      "priority": "hoch",
      "owner": "Architekt/Bauherr",
      "target_request": "bald",
      "target_award": "mit Dachplanung",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "FALSE",
      "comment": "Aluminium-Blechdach empfohlen"
    },
    {
      "trade_id": "TR-HLS",
      "trade": "Hydrauliker/Heizung/Sanitaer",
      "priority": "kritisch",
      "owner": "Bauherr/Architekt",
      "target_request": "sofort",
      "target_award": "vor Technikplanung",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "TRUE",
      "comment": "Lueftung, WP, Pellet, Sanitaer"
    },
    {
      "trade_id": "TR-ELT",
      "trade": "Elektriker",
      "priority": "kritisch",
      "owner": "Bauherr/Architekt",
      "target_request": "sofort",
      "target_award": "vor Technikplanung",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "TRUE",
      "comment": "PV, Batterie, KNX, Wallbox, Blitzschutz"
    },
    {
      "trade_id": "TR-SCHL",
      "trade": "Schlosser",
      "priority": "mittel",
      "owner": "Architekt/Bauherr",
      "target_request": "nach Detailplanung",
      "target_award": "vor Carport/Gelaender",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "FALSE",
      "comment": "Carport Stahlkonstruktion empfohlen"
    },
    {
      "trade_id": "TR-BODEN",
      "trade": "Bodenbeläge",
      "priority": "mittel",
      "owner": "Bauherrin",
      "target_request": "spaeter",
      "target_award": "vor Innenausbau",
      "status": "Eigenvergabe",
      "blocks_construction_start": "FALSE",
      "comment": "Balkonbelag und Aufbau klaeren"
    },
    {
      "trade_id": "TR-MAL",
      "trade": "Maler/Gipser",
      "priority": "mittel",
      "owner": "Bauherr/Architekt",
      "target_request": "spaeter",
      "target_award": "nach Rohinstallation",
      "status": "Ausschreibung offen",
      "blocks_construction_start": "FALSE",
      "comment": "Rogen Martin"
    },
    {
      "trade_id": "TR-TISCH",
      "trade": "Tischler/Innentueren",
      "priority": "mittel",
      "owner": "Bauherrin",
      "target_request": "spaeter",
      "target_award": "vor Innenausbau",
      "status": "Eigenvergabe",
      "blocks_construction_start": "FALSE",
      "comment": "Innentueren, Tischler"
    }
  ],
  "companies": [
    {
      "company_id": "COMP-FELDERER",
      "trade_id": "TR-BAU",
      "company": "Felderer Bau",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-WIDMANN",
      "trade_id": "TR-BAU",
      "company": "Widmann Bau",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-ARNOLD",
      "trade_id": "TR-BAU",
      "company": "Arnold Bau",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-SALCHER",
      "trade_id": "TR-BAU",
      "company": "Salcher Bau",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": "Schallschutz pruefen"
    },
    {
      "company_id": "COMP-WOLF",
      "trade_id": "TR-FEN",
      "company": "Wolf",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-TIPTOP",
      "trade_id": "TR-FEN",
      "company": "TipTop",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-STFEN",
      "trade_id": "TR-FEN",
      "company": "Suedtirol Fenster",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-SILGONER",
      "trade_id": "TR-ZIM",
      "company": "Silgoner",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-BODNER",
      "trade_id": "TR-ZIM",
      "company": "Bodner",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-OBERRAUCHZ",
      "trade_id": "TR-ZIM",
      "company": "Oberrauch",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-BRUGGER",
      "trade_id": "TR-ZIM",
      "company": "Brugger Holzbau",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-OBERRAUCHS",
      "trade_id": "TR-SPEN",
      "company": "Oberrauch",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-DORFMANN",
      "trade_id": "TR-SPEN",
      "company": "Dietmar Dorfmann",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-PUTZER",
      "trade_id": "TR-SPEN",
      "company": "Putzer Hubert",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-STAMPFLSPEN",
      "trade_id": "TR-SPEN",
      "company": "Stampfl",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-THALER",
      "trade_id": "TR-HLS",
      "company": "Thaler",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": "Bestandsheizung/Installateur"
    },
    {
      "company_id": "COMP-STAMPFLBR",
      "trade_id": "TR-ELT",
      "company": "Stampfl Brunner",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-KREITHNER",
      "trade_id": "TR-SCHL",
      "company": "Kreithner",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-GAMPER",
      "trade_id": "TR-SCHL",
      "company": "Gamper Guenther",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-PLOSE",
      "trade_id": "TR-SCHL",
      "company": "Plosemetall",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    },
    {
      "company_id": "COMP-ROGEN",
      "trade_id": "TR-MAL",
      "company": "Rogen Martin",
      "contact": "",
      "status": "Liste",
      "offer_id": "",
      "final": "FALSE",
      "comment": ""
    }
  ],
  "bureaucracy": [
    {
      "bureau_id": "B-UNBED",
      "area": "Gemeinde/Provinz",
      "task": "Unbedenklichkeitserklaerung fuer Wohnbaufoerderungsbindung",
      "owner": "Notarin/Gemeinde/Provinz",
      "status": "wartet auf Dritte",
      "deadline": "2026-07-13",
      "priority": "kritisch",
      "blocks": "Notar, Schenkung, Verpflichtungserklaerung",
      "document_id": "DOC-STATUS-BUER",
      "comment": "aus Bindung 1999 laut Notiz"
    },
    {
      "bureau_id": "B-NOTAR",
      "area": "Notar",
      "task": "Schenkungsvertrag und Verpflichtungserklaerung",
      "owner": "Notarin/Parteien",
      "status": "blockiert",
      "deadline": "2026-07-31",
      "priority": "kritisch",
      "blocks": "Foerderantrag, Umschreibung Baukonzession",
      "document_id": "DOC-STATUS-BUER",
      "comment": "Termin ab 13. Juli geplant"
    },
    {
      "bureau_id": "B-EEVE-I",
      "area": "EEVE",
      "task": "EEVE 2025 Ingrid",
      "owner": "Ingrid",
      "status": "offen/pruefen",
      "deadline": "2026-07-02",
      "priority": "hoch",
      "blocks": "Wohnbaufoerderung",
      "document_id": "DOC-STATUS-BUER",
      "comment": ""
    },
    {
      "bureau_id": "B-EEVE-M",
      "area": "EEVE",
      "task": "EEVE 2025 Maximilian",
      "owner": "Maximilian",
      "status": "offen/pruefen",
      "deadline": "2026-07-13",
      "priority": "hoch",
      "blocks": "Wohnbaufoerderung",
      "document_id": "DOC-STATUS-BUER",
      "comment": ""
    },
    {
      "bureau_id": "B-FOERD",
      "area": "Wohnbaufoerderung",
      "task": "Antrag Wohnbaufoerderung einreichen",
      "owner": "Parteien",
      "status": "offen",
      "deadline": "2026-08-15",
      "priority": "kritisch",
      "blocks": "Baustart/30 Tage Wartefrist",
      "document_id": "DOC-STATUS-BUER",
      "comment": "ab Mitte Juli geplant"
    },
    {
      "bureau_id": "B-BAUKONZ",
      "area": "Baukonzession",
      "task": "Baukonzession / Umschreibung auf Maximilian",
      "owner": "Architekt/Parteien",
      "status": "offen",
      "deadline": "",
      "priority": "hoch",
      "blocks": "Foerderung/Baustart",
      "document_id": "DOC-STATUS-BUER",
      "comment": ""
    }
  ],
  "technicians": [
    {
      "tech_id": "TECH-KLEMENT",
      "name": "Klement Architects",
      "role": "Architekt / Planung / Bauleitung",
      "status": "beauftragt",
      "cost_id": "C-ARCH-001",
      "included": "Vorprojekt, Einreichung, Ausfuehrung, Ausschreibung, Bauleitung, Abrechnung, Abnahme",
      "excluded": "Statik, SiGeKo, Klimahaus, ENEA, Haustechnik",
      "contact": "info@archklement.it",
      "comment": ""
    },
    {
      "tech_id": "TECH-TROGER",
      "name": "Manuel Troger",
      "role": "Statik",
      "status": "Angebot/ok",
      "cost_id": "C-STAT-001",
      "included": "Statik pruefen",
      "excluded": "",
      "contact": "",
      "comment": "3.700 netto laut Statusnotiz"
    },
    {
      "tech_id": "TECH-CONSALVO",
      "name": "Diego Consalvo",
      "role": "Klimahaus / Sicherheit / Abschreibungen Anfrage",
      "status": "angefragt/offen",
      "cost_id": "",
      "included": "offen",
      "excluded": "",
      "contact": "",
      "comment": "Mail an Consalvo laut Statusnotiz"
    },
    {
      "tech_id": "TECH-PSP",
      "name": "PSP STP GmbH / Wilhelm Obwexer",
      "role": "Steuerberatung",
      "status": "teilweise erledigt",
      "cost_id": "C-PSP-001",
      "included": "Beratung Steuer/Foerderung",
      "excluded": "weitere Termine/2% Honorar optional",
      "contact": "info@psp-bz.it",
      "comment": ""
    }
  ],
  "energy_inputs": [
    {
      "input_id": "E-PV-001",
      "module": "PV",
      "name": "PV nur SW-Giebeldach",
      "value": "TRUE",
      "unit": "",
      "editable": "FALSE",
      "source": "Nutzerentscheidung",
      "comment": "Carport und Gegenseite ausgeschlossen"
    },
    {
      "input_id": "E-PV-002",
      "module": "PV",
      "name": "PVGIS Ertrag",
      "value": "1296.61",
      "unit": "kWh/kWp/a",
      "editable": "FALSE",
      "source": "PVGIS Bericht",
      "comment": "1kWp, 14% Verlust, berechneter Horizont"
    },
    {
      "input_id": "E-PV-003",
      "module": "PV",
      "name": "Nutzbare Dachflaeche",
      "value": "32",
      "unit": "m2",
      "editable": "TRUE",
      "source": "Berechnung 42m2 - 10m2 Abzug",
      "comment": "Arbeitswert, CAD pruefen"
    },
    {
      "input_id": "E-WP-001",
      "module": "WP",
      "name": "Wärmepumpe Default",
      "value": "8.5",
      "unit": "kW",
      "editable": "TRUE",
      "source": "Arbeitsoptimum",
      "comment": "Regler 5-12 kW"
    },
    {
      "input_id": "E-BAT-001",
      "module": "Batterie",
      "name": "Batterie Default",
      "value": "12",
      "unit": "kWh",
      "editable": "TRUE",
      "source": "Dashboard Empfehlung",
      "comment": "sinnvoller Rahmen ca. 10-14 kWh"
    },
    {
      "input_id": "E-PEL-001",
      "module": "Pellet",
      "name": "Pellet Leistung",
      "value": "10.2",
      "unit": "kW_th",
      "editable": "FALSE",
      "source": "Pelletsanlage_Doc",
      "comment": "Bestandsanlage"
    },
    {
      "input_id": "E-PEL-002",
      "module": "Pellet",
      "name": "Pellet Wirkungsgrad",
      "value": "92.8",
      "unit": "%",
      "editable": "FALSE",
      "source": "Pelletsanlage_Doc",
      "comment": ""
    }
  ],
  "energy_results": [
    {
      "scenario": "Bestand/Referenz",
      "pv_kwp": "0",
      "battery_kwh": "0",
      "heat_pump_kw": "0",
      "pellet_active": "TRUE",
      "grid_kwh": "4200",
      "pellet_kg": "",
      "autarky_percent": "0",
      "annual_energy_cost": "1279",
      "comment": "Stromverbrauch aus Kosten geschaetzt"
    },
    {
      "scenario": "Mit Pellet Übergang",
      "pv_kwp": "7.2",
      "battery_kwh": "12",
      "heat_pump_kw": "6",
      "pellet_active": "TRUE",
      "grid_kwh": "",
      "pellet_kg": "",
      "autarky_percent": "",
      "annual_energy_cost": "",
      "comment": "wird im Dashboard berechnet"
    },
    {
      "scenario": "Ohne Pellet Ziel",
      "pv_kwp": "7.2",
      "battery_kwh": "12",
      "heat_pump_kw": "8.5",
      "pellet_active": "FALSE",
      "grid_kwh": "",
      "pellet_kg": "0",
      "autarky_percent": "",
      "annual_energy_cost": "",
      "comment": "wird im Dashboard berechnet"
    }
  ],
  "documents": [
    {
      "document_id": "DOC-EINREICH",
      "category": "Planung",
      "title": "2026.03.04 EINREICHUNG Ingrid Harder.pdf",
      "date": "2026-03-04",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Grundrisse, Lageplan, Schnitte, Kubatur"
    },
    {
      "document_id": "DOC-TECHBERICHT",
      "category": "Planung",
      "title": "2025.03.04 Technischer Bericht.pdf",
      "date": "2025-03-04",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Klimahaus B, Pellet, PV ca.4kW"
    },
    {
      "document_id": "DOC-TAUSEND",
      "category": "Parteien",
      "title": "2026.06.04 Tausendstelltabelle_signed.pdf",
      "date": "2026-06-04",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "W1 466, W2 534"
    },
    {
      "document_id": "DOC-KATASTER",
      "category": "Eigentum",
      "title": "Einsichtnahme_Grundkataster__HRDNRD72C49A952P.pdf",
      "date": "2026-03-10",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "B.P.251, 295m2, Ingrid Eigentum 1/1"
    },
    {
      "document_id": "DOC-ARCH-001",
      "category": "Techniker",
      "title": "2025-204 Planungsauftrag - Aufstockung Wohnhaus Maxi Hofer - Natz.pdf",
      "date": "2026-03-12",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Architektenhonorar und Leistungsumfang"
    },
    {
      "document_id": "DOC-PSP-001",
      "category": "Steuer",
      "title": "20260316-Kostenvoranschlag-PSP-Obwexer.pdf",
      "date": "2026-03-16",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Steuerberatung Kosten"
    },
    {
      "document_id": "DOC-KUE-RESCH",
      "category": "Angebot",
      "title": "Angebot Küche Resch 05.06.2026.pdf",
      "date": "2026-05-22",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Küche W2"
    },
    {
      "document_id": "DOC-KUE-STAMPFL",
      "category": "Angebot",
      "title": "Angebot Kücheneinrichtung.pdf",
      "date": "2026-03-20",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Küche W2"
    },
    {
      "document_id": "DOC-PELLET",
      "category": "Bestand",
      "title": "Pelletsanlage_Doc.pdf",
      "date": "2013",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Guntamatic THERM 10 Flex"
    },
    {
      "document_id": "DOC-ALPERIA",
      "category": "Strom",
      "title": "Strom_Alperia_Doc.pdf",
      "date": "2026",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Alperia Preis und Istkosten"
    },
    {
      "document_id": "DOC-PVGIS",
      "category": "PV",
      "title": "PVGIS-5_GridConnectedPV_46.754_11.678...pdf",
      "date": "2026-07-09",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "PVGIS Ertrag 1kWp"
    },
    {
      "document_id": "DOC-STATUS-ARCH",
      "category": "Status",
      "title": "Status_Architekt_20260711.pdf",
      "date": "2026-07-11",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Timeline, Ausschreibungen, Entscheidungen"
    },
    {
      "document_id": "DOC-STATUS-BUER",
      "category": "Status",
      "title": "Status_Bürokratie_20260711.pdf",
      "date": "2026-07-11",
      "status": "vorhanden",
      "file_url": "",
      "source_note": "Finanzierung, Foerderung, Notar, EEVE"
    }
  ],
  "decisions": [
    {
      "decision_id": "DEC-TREPPE",
      "area": "Treppen",
      "decision": "Holztreppe EG -> 1. OG erhalten oder ersetzen",
      "options": "erhalten|ersetzen|betonieren",
      "recommendation": "Baumeister/Statik/Kosten pruefen",
      "status": "offen",
      "priority": "hoch",
      "deadline": "vor Baumeistervergabe",
      "depends_on": "Architektur/Kosten/Baumeister",
      "cost_impact": "mittel-hoch",
      "energy_impact": "gering",
      "comment": ""
    },
    {
      "decision_id": "DEC-FEN-EG",
      "area": "Fenster",
      "decision": "EG-Fenster ersetzen oder Bestand belassen",
      "options": "ersetzen|bestand behalten",
      "recommendation": "Klimahaus-Nachweis und Einsparpotenzial 40-50k pruefen",
      "status": "offen",
      "priority": "hoch",
      "deadline": "vor Klimahaus/Fensterausschreibung",
      "depends_on": "Klimahaus, Zustand Bestand",
      "cost_impact": "hoch",
      "energy_impact": "hoch",
      "comment": ""
    },
    {
      "decision_id": "DEC-LUEFTUNG",
      "area": "Lueftung",
      "decision": "zentrale oder dezentrale Lueftung W2",
      "options": "zentral|dezentral|keine",
      "recommendation": "Haustechnik/Klimahaus abklaeren",
      "status": "offen",
      "priority": "hoch",
      "deadline": "vor HLS-Angebot",
      "depends_on": "Haustechnik/Energieeffizienz",
      "cost_impact": "mittel",
      "energy_impact": "mittel",
      "comment": ""
    },
    {
      "decision_id": "DEC-WP",
      "area": "Heizung",
      "decision": "WP sofort oder WP-ready mit Pellet als Uebergang",
      "options": "mit Pellet Uebergang|ohne Pellet Ziel|WP sofort",
      "recommendation": "WP auf Endzustand ohne Pellet auslegen",
      "status": "offen",
      "priority": "hoch",
      "deadline": "vor HLS/Elektro/PV",
      "depends_on": "Heizlast, HLS, PV",
      "cost_impact": "hoch",
      "energy_impact": "hoch",
      "comment": ""
    },
    {
      "decision_id": "DEC-PV",
      "area": "Elektro/PV",
      "decision": "PV-Groesse auf SW-Dach",
      "options": "max Dach|reduziert|spaeter",
      "recommendation": "maximal sinnvolle SW-Dachflaeche, Dachfenster abziehen",
      "status": "offen",
      "priority": "hoch",
      "deadline": "vor Elektriker/PV-Angebot",
      "depends_on": "Dachflaeche, Statik, Energiebedarf",
      "cost_impact": "mittel",
      "energy_impact": "hoch",
      "comment": ""
    },
    {
      "decision_id": "DEC-BAT",
      "area": "Elektro/Batterie",
      "decision": "Batteriespeicher ja/nein und kWh",
      "options": "0|8|10|12|14|16",
      "recommendation": "10-14 kWh pruefen",
      "status": "offen",
      "priority": "mittel",
      "deadline": "vor PV/Elektrovergabe",
      "depends_on": "PV-Konzept/Budget",
      "cost_impact": "mittel",
      "energy_impact": "mittel",
      "comment": ""
    },
    {
      "decision_id": "DEC-KUECHE",
      "area": "Innenausbau",
      "decision": "Kueche Resch oder Stampfl",
      "options": "Resch|Stampfl|weiteres Angebot",
      "recommendation": "Preis/Leistung vergleichen, Anschluesse frueh fixieren",
      "status": "offen",
      "priority": "mittel",
      "deadline": "vor Elektro/Hydraulik-Installationsplan",
      "depends_on": "Kuechenplanung",
      "cost_impact": "mittel",
      "energy_impact": "gering",
      "comment": ""
    }
  ],
  "offer_items": [
    {
      "offer_id": "OFF-RESCH-20260522",
      "position": "1",
      "description": "Kuechenmoebel laut Angebot",
      "quantity": "1",
      "unit": "pauschal",
      "unit_price": "",
      "total_net": "",
      "comment": "Details im PDF"
    },
    {
      "offer_id": "OFF-STAMPFL-20260320",
      "position": "1",
      "description": "Kuechen Verbau",
      "quantity": "1",
      "unit": "pauschal",
      "unit_price": "13121",
      "total_net": "13121",
      "comment": ""
    },
    {
      "offer_id": "OFF-STAMPFL-20260320",
      "position": "2",
      "description": "Arbeitsplatten",
      "quantity": "1",
      "unit": "pauschal",
      "unit_price": "4520",
      "total_net": "4520",
      "comment": ""
    },
    {
      "offer_id": "OFF-STAMPFL-20260320",
      "position": "3",
      "description": "Einbaugeraete und Zubehoer",
      "quantity": "1",
      "unit": "pauschal",
      "unit_price": "8259",
      "total_net": "8259",
      "comment": ""
    }
  ],
  "cashflow": [
    {
      "cashflow_id": "CF-PLAN-001",
      "date": "2026-04-27",
      "phase": "Planung",
      "party": "Ingrid Harder",
      "category": "Architekt",
      "expected_outflow": "22208.25",
      "expected_inflow": "0",
      "funding_source": "Eigenkapital Ingrid",
      "status": "bezahlt/pruefen",
      "linked_cost_id": "C-ARCH-001",
      "comment": "erste Honorarzahlung laut Statusnotiz; Betrag bitte pruefen"
    },
    {
      "cashflow_id": "CF-FOER-001",
      "date": "2026-07-31",
      "phase": "Foerderung/Notar",
      "party": "beide",
      "category": "Notar/Buerokratie",
      "expected_outflow": "0",
      "expected_inflow": "0",
      "funding_source": "offen",
      "status": "geplant",
      "linked_cost_id": "",
      "comment": "Schenkung und Verpflichtungserklaerung nach Unbedenklichkeit"
    },
    {
      "cashflow_id": "CF-BAU-001",
      "date": "2026-09-01",
      "phase": "Baubeginn",
      "party": "beide",
      "category": "Baumeister/Anzahlungen",
      "expected_outflow": "0",
      "expected_inflow": "0",
      "funding_source": "Kredit/Eigenkapital",
      "status": "Planwert offen",
      "linked_cost_id": "",
      "comment": "Baubeginn nur vorlaeufig September 2026; Ausschreibungen abwarten"
    },
    {
      "cashflow_id": "CF-ZDL-001",
      "date": "2026-09-30",
      "phase": "Finanzierung",
      "party": "Maximilian Hofer",
      "category": "Zinsbeguenstigtes Darlehen",
      "expected_outflow": "0",
      "expected_inflow": "250000",
      "funding_source": "ZDL Suedtirol",
      "status": "offen",
      "linked_cost_id": "",
      "comment": "bis 250.000 EUR laut Notizen, Abhaengig von Antrag/Foerderung"
    }
  ],
  "audit_log": [
    {
      "log_id": "LOG-SEED-001",
      "timestamp": "2026-07-11T15:25:39Z",
      "user": "system",
      "action": "seed",
      "sheet": "all",
      "row_id": "",
      "details": "Initiale Paketdaten aus Projektunterlagen und Notizen"
    }
  ]
};
const VALIDATION_LISTS = {
  "status": [
    "offen",
    "in Vorbereitung",
    "angefragt",
    "wartet auf Dritte",
    "Angebot erhalten",
    "Rueckfrage offen",
    "Entscheidung noetig",
    "final ausgewaehlt",
    "beauftragt",
    "blockiert",
    "erledigt",
    "bezahlt",
    "verworfen"
  ],
  "priority": [
    "kritisch",
    "hoch",
    "mittel",
    "niedrig"
  ],
  "boolean": [
    "TRUE",
    "FALSE"
  ],
  "party_assignment": [
    "W1",
    "W2",
    "gemeinsam",
    "projekt",
    "manual"
  ],
  "split_key": [
    "100_w1",
    "100_w2",
    "thousandths_466_534",
    "50_50",
    "manual"
  ],
  "financing_type": [
    "Grobkosten",
    "Eigenkapital",
    "Landesfoerderung",
    "Zinsbeguenstigtes Darlehen",
    "Bankkredit",
    "Zwischenfinanzierung",
    "Foerderungsrueckfluss"
  ],
  "source_type": [
    "Plan",
    "Dokument",
    "Annahme",
    "Angebot",
    "Auftrag",
    "Rechnung",
    "Zahlung",
    "berechnet",
    "offen"
  ]
};
const ID_FIELDS = {
  budget_estimates:'estimate_id', cost_positions:'cost_id', offers:'offer_id', offer_items:'offer_item_id', payments:'payment_id', financing:'finance_id', bank_offers:'bank_offer_id', subsidies:'subsidy_id', timeline_tasks:'task_id', trades:'trade_id', companies:'company_id', bureaucracy:'bureau_id', technicians:'tech_id', energy_inputs:'input_id', documents:'document_id', decisions:'decision_id', cashflow:'cashflow_id', audit_log:'log_id'
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Umbau H8 Backend')
    .addItem('Setup: Tabs + Header', 'setupWorkbook')
    .addItem('Setup: Tabs + Seed-Daten', 'setupWorkbookWithSeedData')
    .addItem('Migration: Schema aktualisieren (v2)', 'migrateSchema')
    .addSeparator()
    .addItem('API Token setzen', 'setApiToken')
    .addItem('Health Check', 'healthCheck')
    .addToUi();
}

function setupWorkbook() {
  createSheetsAndHeaders_(false);
  writeValidationSheet_();
  applyFormatting_();
  applyDataValidations_();
  SpreadsheetApp.getUi().alert('Backend Tabs und Header erstellt/aktualisiert. Bestehende Daten wurden nicht geloescht.');
}

function setupWorkbookWithSeedData() {
  createSheetsAndHeaders_(true);
  seedData_(true);
  writeValidationSheet_();
  applyFormatting_();
  applyDataValidations_();
  SpreadsheetApp.getUi().alert('Backend fertig: alle Tabs, Header und Seed-Daten wurden erstellt.');
}

function setApiToken() {
  const token = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('WRITE_TOKEN', token);
  Logger.log('WRITE_TOKEN: ' + token);
  SpreadsheetApp.getUi().alert('WRITE_TOKEN wurde erzeugt. Apps-Script-Log oeffnen und Token in docs/assets/js/config.js eintragen.');
}

function healthCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {version: BACKEND_VERSION, project: PROJECT_NAME, sheets: {}};
  SHEET_ORDER.forEach(name => {
    const sh = ss.getSheetByName(name);
    result.sheets[name] = sh ? {exists:true, rows: Math.max(0, sh.getLastRow()-1), cols: sh.getLastColumn()} : {exists:false};
  });
  Logger.log(JSON.stringify(result, null, 2));
  SpreadsheetApp.getUi().alert('Health Check abgeschlossen. Details im Log.');
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || 'readAll';
    if (action === 'schema') return json_({ok:true, version:BACKEND_VERSION, schema:SCHEMA, order:SHEET_ORDER});
    if (action === 'health') return json_({ok:true, version:BACKEND_VERSION, project:PROJECT_NAME, time:new Date().toISOString()});
    if (action === 'read') return json_({ok:true, sheet:p.sheet, data:readSheet_(p.sheet)});
    return json_({ok:true, version:BACKEND_VERSION, data:readAll_()});
  } catch(err) {
    return json_({ok:false, error:String(err), stack:err.stack || ''});
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (!checkToken_(payload.token)) return json_({ok:false, error:'invalid_token'});
    const action = payload.action || '';
    let result;
    if (action === 'append') result = appendRow_(payload.sheet, payload.data || {});
    else if (action === 'upsert') result = upsertRow_(payload.sheet, payload.idField, payload.idValue, payload.data || {});
    else if (action === 'updateById') result = updateById_(payload.sheet, payload.idField, payload.idValue, payload.data || {});
    else if (action === 'deleteById') result = deleteById_(payload.sheet, payload.idField, payload.idValue);
    else if (action === 'batchAppend') result = batchAppend_(payload.sheet, payload.rows || []);
    else if (action === 'awardOffer') result = awardOffer_(payload.offerId);
    else return json_({ok:false, error:'unknown_action', action:action});
    audit_(action, payload.sheet, payload.idValue || '', JSON.stringify(payload.data || payload.rows || {}).slice(0,500));
    return json_(result);
  } catch(err) {
    return json_({ok:false, error:String(err), stack:err.stack || ''});
  }
}

function createSheetsAndHeaders_(reset) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEET_ORDER.forEach(name => {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (reset) sh.clear();
    const headers = SCHEMA[name];
    if (sh.getLastRow() === 0 || reset) sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  });
}

function seedData_(reset) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEET_ORDER.forEach(name => {
    const rows = SEED_DATA[name] || [];
    const headers = SCHEMA[name];
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (reset) { sh.clear(); sh.getRange(1,1,1,headers.length).setValues([headers]); }
    if (rows.length) {
      const values = rows.map(r => headers.map(h => r[h] === undefined ? '' : r[h]));
      sh.getRange(2,1,values.length,headers.length).setValues(values);
    }
  });
}

function writeValidationSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('_validation') || ss.insertSheet('_validation');
  sh.clear();
  const keys = Object.keys(VALIDATION_LISTS);
  const maxLen = Math.max.apply(null, keys.map(k => VALIDATION_LISTS[k].length));
  const rows = [keys];
  for (let i=0;i<maxLen;i++) rows.push(keys.map(k => VALIDATION_LISTS[k][i] || ''));
  sh.getRange(1,1,rows.length,keys.length).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,keys.length).setBackground('#15223a').setFontColor('#ffffff').setFontWeight('bold');
  sh.autoResizeColumns(1, keys.length);
}

function applyFormatting_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEET_ORDER.forEach(name => {
    const sh = ss.getSheetByName(name); if (!sh) return;
    const cols = SCHEMA[name].length;
    sh.getRange(1,1,1,cols).setBackground('#15223a').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, cols);
    for (let c=1;c<=cols;c++) if (sh.getColumnWidth(c)>260) sh.setColumnWidth(c,260);
  });
}

function applyDataValidations_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maps = [
    {sheet:'offers', col:'status', list:'status'}, {sheet:'offers', col:'final', list:'boolean'}, {sheet:'offers', col:'party_assignment', list:'party_assignment'},
    {sheet:'cost_positions', col:'status', list:'status'}, {sheet:'cost_positions', col:'final', list:'boolean'}, {sheet:'cost_positions', col:'split_key', list:'split_key'},
    {sheet:'timeline_tasks', col:'status', list:'status'}, {sheet:'timeline_tasks', col:'priority', list:'priority'},
    {sheet:'trades', col:'priority', list:'priority'}, {sheet:'trades', col:'blocks_construction_start', list:'boolean'},
    {sheet:'companies', col:'final', list:'boolean'}, {sheet:'decisions', col:'priority', list:'priority'}, {sheet:'decisions', col:'status', list:'status'},
    {sheet:'financing', col:'type', list:'financing_type'}, {sheet:'subsidies', col:'status', list:'status'}
  ];
  maps.forEach(m => {
    const sh = ss.getSheetByName(m.sheet); if (!sh) return;
    const idx = SCHEMA[m.sheet].indexOf(m.col) + 1; if (idx <= 0) return;
    const list = VALIDATION_LISTS[m.list] || [];
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
    sh.getRange(2, idx, Math.max(500, sh.getMaxRows()-1), 1).setDataValidation(rule);
  });
}

function readAll_() {
  const out = {};
  SHEET_ORDER.forEach(name => out[name] = readSheet_(name));
  return out;
}

function readSheet_(name) {
  assertSheet_(name);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getDisplayValues();
  const headers = values[0].map(String);
  return values.slice(1).filter(row => row.some(c => String(c).trim() !== '')).map(row => {
    const obj = {}; headers.forEach((h,i) => obj[h] = row[i]); return obj;
  });
}

function appendRow_(name, data) {
  assertSheet_(name);
  const sh = getOrCreateSheet_(name);
  const headers = SCHEMA[name];
  const idField = ID_FIELDS[name];
  if (idField && !data[idField]) data[idField] = generateId_(name);
  const row = headers.map(h => data[h] === undefined ? '' : data[h]);
  sh.appendRow(row);
  return {ok:true, action:'append', sheet:name, id:data[idField] || ''};
}

function batchAppend_(name, rows) {
  assertSheet_(name);
  if (!rows.length) return {ok:true, action:'batchAppend', count:0};
  const sh = getOrCreateSheet_(name);
  const headers = SCHEMA[name];
  const idField = ID_FIELDS[name];
  const values = rows.map(data => {
    if (idField && !data[idField]) data[idField] = generateId_(name);
    return headers.map(h => data[h] === undefined ? '' : data[h]);
  });
  sh.getRange(sh.getLastRow()+1, 1, values.length, headers.length).setValues(values);
  return {ok:true, action:'batchAppend', sheet:name, count:rows.length};
}

function upsertRow_(name, idField, idValue, data) {
  const update = updateById_(name, idField || ID_FIELDS[name], idValue || data[idField || ID_FIELDS[name]], data, true);
  if (update.ok) return update;
  return appendRow_(name, data);
}

function updateById_(name, idField, idValue, data, silentNotFound) {
  assertSheet_(name);
  idField = idField || ID_FIELDS[name];
  if (!idField) return {ok:false, error:'No idField configured'};
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return {ok:false, error:'Sheet not found'};
  const values = sh.getDataRange().getDisplayValues();
  const headers = values[0].map(String);
  const idCol = headers.indexOf(idField);
  if (idCol < 0) return {ok:false, error:'ID field not found'};
  for (let r=1; r<values.length; r++) {
    if (String(values[r][idCol]) === String(idValue)) {
      Object.keys(data).forEach(k => { const c=headers.indexOf(k); if (c>=0) sh.getRange(r+1,c+1).setValue(data[k]); });
      return {ok:true, action:'updateById', sheet:name, row:r+1, id:idValue};
    }
  }
  return silentNotFound ? {ok:false, notFound:true} : {ok:false, error:'ID not found'};
}

function deleteById_(name, idField, idValue) {
  assertSheet_(name);
  idField = idField || ID_FIELDS[name];
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return {ok:false, error:'Sheet not found'};
  const values = sh.getDataRange().getDisplayValues();
  const headers = values[0].map(String);
  const idCol = headers.indexOf(idField);
  for (let r=1; r<values.length; r++) {
    if (String(values[r][idCol]) === String(idValue)) { sh.deleteRow(r+1); return {ok:true, action:'deleteById', id:idValue}; }
  }
  return {ok:false, error:'ID not found'};
}

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,SCHEMA[name].length).setValues([SCHEMA[name]]);
  return sh;
}

function assertSheet_(name) {
  if (!SCHEMA[name]) throw new Error('Unknown sheet: ' + name);
}

function generateId_(name) {
  const prefix = String(name).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6) || 'ROW';
  return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random()*1000);
}

function checkToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('WRITE_TOKEN');
  if (!expected) return true; // Setup-Phase. Fuer produktive Nutzung setApiToken() verwenden.
  return token === expected;
}

function audit_(action, sheet, rowId, details) {
  try {
    if (!SCHEMA.audit_log) return;
    const sh = getOrCreateSheet_('audit_log');
    sh.appendRow([generateId_('audit_log'), new Date().toISOString(), Session.getActiveUser().getEmail() || 'webapp', action, sheet || '', rowId || '', details || '']);
  } catch(e) {}
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =====================================================================
 * PATCH v2 – Angebots-/Auftragslogik + Schema-Migration
 * ===================================================================== */

/**
 * Serverseitige, transaktionale Auftragsvergabe.
 * Spiegelt die Frontend-Logik (store.js awardOffer) wider, damit auch
 * ein direkter POST { action:'awardOffer', offerId:'...' } sauber wirkt.
 * Pro Vergleichsgruppe bleibt nur EIN aktiver Auftrag bestehen.
 */
function awardOffer_(offerId) {
  if (!offerId) return {ok:false, error:'offerId fehlt'};
  const nowIso = new Date().toISOString();
  const offers = readSheet_('offers');
  const offer = offers.filter(function(o){ return String(o.offer_id) === String(offerId); })[0];
  if (!offer) return {ok:false, error:'Angebot nicht gefunden'};

  const group = String(offer.compare_group || offer.trade || '').trim();
  const costs = readSheet_('cost_positions');

  // 1) Bisher aktive Aufträge derselben Gruppe deaktivieren
  offers.forEach(function(o){
    const g = String(o.compare_group || o.trade || '').trim();
    if (g === group && String(o.offer_id) !== String(offerId) && String(o.status) === 'Auftrag erteilt') {
      updateById_('offers', 'offer_id', o.offer_id, {status:'Angebot erfasst', final:'FALSE', active:'FALSE', updated_at:nowIso});
      costs.forEach(function(c){
        if (String(c.offer_id) === String(o.offer_id) && String(c.active).toUpperCase() !== 'FALSE') {
          updateById_('cost_positions', 'cost_id', c.cost_id, {active:'FALSE', status:'ersetzt', updated_at:nowIso});
        }
      });
    }
  });

  // 2) Angebot auf Auftrag setzen
  updateById_('offers', 'offer_id', offerId, {status:'Auftrag erteilt', final:'TRUE', active:'TRUE', updated_at:nowIso});

  // 3) Aktive Kostenposition anlegen oder reaktivieren
  const existing = costs.filter(function(c){ return String(c.offer_id) === String(offerId); })[0];
  if (existing) {
    updateById_('cost_positions', 'cost_id', existing.cost_id, {
      active:'TRUE', status:'beauftragt', gross:offer.gross, net:offer.net, updated_at:nowIso
    });
    return {ok:true, action:'awardOffer', cost_id:existing.cost_id, reactivated:true};
  }
  const res = appendRow_('cost_positions', {
    category: group || offer.trade || 'Sonstiges',
    subcategory: '',
    item: (offer.trade || '') + ' – ' + (offer.supplier || ''),
    supplier: offer.supplier || '',
    status: 'beauftragt',
    source_type: 'Auftrag',
    net: offer.net || 0, vat_rate: offer.vat_rate || 22, gross: offer.gross || 0,
    party_assignment: offer.party_assignment || 'projekt',
    split_key: offer.split_key || '',
    share_w1: offer.share_w1 || '', share_w2: offer.share_w2 || '',
    compare_group: group, offer_id: offerId,
    active: 'TRUE', final: 'TRUE', paid: 'FALSE',
    document_id: offer.document_id || '', risk: offer.excluded || '',
    source: 'awardOffer', created_at: nowIso, updated_at: nowIso
  });
  return {ok:true, action:'awardOffer', cost_id:res.id, created:true};
}

/** Menü-Wrapper für die einmalige Migration. */
function migrateSchema() {
  const report = migrateSchema_();
  SpreadsheetApp.getUi().alert(
    'Migration abgeschlossen.\n\n' +
    'Neu angelegt: ' + (report.created.join(', ') || '–') + '\n' +
    'Spalten ergänzt/neu geordnet: ' + (report.reordered.join(', ') || '–') + '\n' +
    'Unverändert: ' + report.unchanged + ' Tabs.\n\n' +
    'Bestehende Daten wurden zeilenweise nach Spaltenname übernommen.'
  );
}

/**
 * Nicht-destruktive Migration auf Schema v2.
 * - Legt fehlende Tabs an (inkl. budget_estimates).
 * - Bringt die physische Kopfzeile jedes Tabs exakt in SCHEMA-Reihenfolge.
 * - Überträgt vorhandene Zeilen anhand des Spaltennamens (neue Spalten bleiben leer).
 * Kann gefahrlos mehrfach ausgeführt werden (idempotent).
 */
function migrateSchema_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = {created:[], reordered:[], unchanged:0};

  SHEET_ORDER.forEach(function(name){
    const headers = SCHEMA[name];
    let sh = ss.getSheetByName(name);

    // Fehlenden Tab neu anlegen
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      report.created.push(name);
      return;
    }

    // Aktuelle Kopfzeile lesen
    const lastCol = Math.max(1, sh.getLastColumn());
    const current = sh.getRange(1,1,1,lastCol).getDisplayValues()[0]
      .map(function(x){ return String(x).trim(); })
      .filter(function(x){ return x !== ''; });

    // Bereits identisch? -> nichts tun
    const identical = current.length === headers.length &&
      current.every(function(h,i){ return h === headers[i]; });
    if (identical) { report.unchanged++; return; }

    // Daten als Objekte einlesen (nach aktuellem Header)
    const rows = readSheet_(name); // nutzt aktuelle Kopfzeile

    // Blatt neu schreiben in SCHEMA-Reihenfolge
    sh.clearContents();
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    if (rows.length) {
      const values = rows.map(function(r){
        return headers.map(function(h){ return r[h] === undefined ? '' : r[h]; });
      });
      sh.getRange(2,1,values.length,headers.length).setValues(values);
    }
    sh.setFrozenRows(1);
    report.reordered.push(name);
  });

  // Formatierung/Validierung neu anwenden (best effort)
  try { applyFormatting_(); } catch(e){}
  try { applyDataValidations_(); } catch(e){}
  try { writeValidationSheet_(); } catch(e){}

  audit_('migrateSchema', 'ALL', 'v2',
    'created=' + report.created.length + ' reordered=' + report.reordered.length);
  return report;
}
