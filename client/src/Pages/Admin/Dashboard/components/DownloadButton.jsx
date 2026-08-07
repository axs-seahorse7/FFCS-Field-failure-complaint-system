// components/DownloadButton.jsx
import { useState, useMemo } from "react";
import { Modal, Button, Radio, Select, DatePicker, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../../../services/axios-interceptore/api";       // ⚠️ path check karo
import { CUSTOMERS } from "../../../../utils/cutomers/customers.js"; // ⚠️ path check karo

const { Option } = Select;

/* Fixed presets — all inherently within the 1-month backend cap */
const PRESETS = [
  { key: "today",     label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d",        label: "Last 7 Days" },
  { key: "1m",        label: "Last 1 Month" },
  { key: "customMonth", label: "Custom Month" },
];

function presetToRange(key, customMonth) {
  const now = dayjs();
  switch (key) {
    case "today":     return [now.startOf("day"), now.endOf("day")];
    case "yesterday": return [now.subtract(1, "day").startOf("day"), now.subtract(1, "day").endOf("day")];
    case "7d":        return [now.subtract(6, "day").startOf("day"), now.endOf("day")];
    case "1m":        return [now.subtract(1, "month").startOf("day"), now.endOf("day")];
    case "customMonth":
      return customMonth
        ? [customMonth.startOf("month"), customMonth.endOf("month")]
        : [null, null];
    default:          return [null, null];
  }
}

/* ── Colorful section heading ── */
const SectionHeading = ({ children, color }) => (
  <div style={{
    fontSize: 11, fontWeight: 800, color,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
    display: "flex", alignItems: "center", gap: 6,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
    {children}
  </div>
);

export default function DownloadButton({ filter, totalRecords }) {
  const [open, setOpen]               = useState(false);
  const [preset, setPreset]           = useState("1m");
  const [customMonth, setCustomMonth] = useState(null); // dayjs, only used when preset === "customMonth"
  const [customer, setCustomer]       = useState(filter?.customer || "All");
  const [status, setStatus]           = useState("All");
  const [downloading, setDownloading] = useState(false);

  const [start, end] = useMemo(
    () => presetToRange(preset, customMonth),
    [preset, customMonth]
  );

  const daysSelected = start && end ? end.diff(start, "day") + 1 : 0;
  const canDownload  = !!start && !!end;

  const handleDownload = async () => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const params = {
        startDate: start.toISOString(),
        endDate:   end.toISOString(),
      };
      if (customer !== "All") params.customer = customer;
      if (status   !== "All") params.status   = status;

      const res = await api.get("/complaints/download", { params, responseType: "blob" });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `complaints_${start.format("YYYYMMDD")}_${end.format("YYYYMMDD")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      message.success("Download started");
      setOpen(false);
    } catch (err) {
      message.error(err?.response?.data?.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button icon={<DownloadOutlined />} onClick={() => setOpen(true)}
        style={{ borderRadius: 11, fontWeight: 700, fontSize: 12 }}>
        Download{totalRecords ? ` (${totalRecords})` : ""}
      </Button>

      <Modal title="Download Complaints" open={open} onCancel={() => setOpen(false)} footer={null} width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 6 }}>

          {/* Date Range */}
          <div>
            <SectionHeading color="#3b82f6">Date Range</SectionHeading>
            <Radio.Group
              value={preset}
              onChange={e => { setPreset(e.target.value); if (e.target.value !== "customMonth") setCustomMonth(null); }}
              style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
            >
              {PRESETS.map(p => (
                <Radio.Button key={p.key} value={p.key} style={{ borderRadius: 8 }}>{p.label}</Radio.Button>
              ))}
            </Radio.Group>

            {/* Month + Year picker — only shown for Custom Month */}
            {preset === "customMonth" && (
              <div style={{ marginTop: 10 }}>
                <DatePicker
                  picker="month"
                  value={customMonth}
                  onChange={setCustomMonth}
                  format="MMMM YYYY"
                  placeholder="e.g. January 2022, August 2026"
                  style={{ width: "100%" }}
                  disabledDate={d => d && d.isAfter(dayjs(), "month")}
                />
              </div>
            )}

            {start && end && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>
                {start.format("DD MMM YYYY")} → {end.format("DD MMM YYYY")} ({daysSelected} days)
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
              Maximum 1 month ka data ek baar mein download ho sakta hai.
            </div>
          </div>

          {/* Customer */}
          <div>
            <SectionHeading color="#7c3aed">Customer</SectionHeading>
            <Select value={customer} onChange={setCustomer} style={{ width: "100%" }} showSearch>
              <Option value="All">All Customers</Option>
              {CUSTOMERS.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </div>

          {/* Status */}
          <div>
            <SectionHeading color="#16a34a">Status</SectionHeading>
            <Radio.Group value={status} onChange={e => setStatus(e.target.value)}>
              {["All", "Open", "Pending", "Resolved"].map(s => (
                <Radio.Button key={s} value={s} style={{ borderRadius: 8 }}>{s}</Radio.Button>
              ))}
            </Radio.Group>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="primary" icon={<DownloadOutlined />} loading={downloading}
              disabled={!canDownload}
              onClick={handleDownload}
            >
              Download
            </Button>
          </div>

        </div>
      </Modal>
    </>
  );
}