import { useState } from "react";
import { Button, Modal, DatePicker, Form, Space, Typography, Spin, message } from "antd";
import { DownloadOutlined, CalendarOutlined, FileExcelOutlined } from "@ant-design/icons";
import api from "../../../../services/axios-interceptore/api";
import axios from "axios";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function DownloadButton({filter, totalRecords}) {
  const baseUri = import.meta.env.VITE_API_URI || "http://localhost:3000/api";
  const [open,       setOpen]       = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [form]                      = Form.useForm();


  const handleDownload = async () => {
    if(!filter?.from || !filter?.to) {
      return message.error("Please select a valid date range before downloading.");
    }
    try {
    //   const values = await form.validateFields();
    //   const [start, end] = values.dateRange;

      setLoading(true);
      message.loading({ content: "Generating report...", key: "download" });

      const res = await api.get(`${baseUri}/complaints/download`, {
        params: {
          startDate: filter.from,
          endDate:   filter.to,
          customer: filter.customer // only include if set
        },
        responseType: "blob",
      });

      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;

      const disposition = res.headers["content-disposition"] || "";
      const match       = disposition.match(/filename="?([^"]+)"?/);
      const filename    = match
        ? match[1]
        : `complaints_${filter.from.format("YYYYMMDD")}_${filter.to.format("YYYYMMDD")}.xlsx`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setOpen(false);
      form.resetFields();

      message.destroy("download");
    } catch (err) {
      if (err?.errorFields) return; // form validation — stay open
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    setOpen(false);
    form.resetFields();
  };

  // Quick-select presets
  const presets = [
    { label: "This Month",  value: [dayjs().startOf("month"),   dayjs()] },
    { label: "Last Month",  value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
    { label: "Last 3 Months", value: [dayjs().subtract(3, "month"), dayjs()] },
    { label: "This Year",   value: [dayjs().startOf("year"),    dayjs()] },
  ];

  return (
    <>
      <Button
        icon={<DownloadOutlined style={{ fontSize: 14 }} />}
        onClick={() => setOpen(true)}
      >
        Download
      </Button>

      <Modal
        open={open}
        onCancel={handleCancel}
        closable={!loading}
        maskClosable={!loading}
        width={420}
        footer={null}
        title={
          <Space>
            <FileExcelOutlined style={{ color: "#16a34a", fontSize: 18 }} />
            <span>Download Complaints Report</span>
          </Space>
        }
      >
            <div className="mt-6">
                Total Records: <span className="font-semibold">{totalRecords}</span>, For Customer: <span className="font-semibold">{filter.customer || "All"}</span>
            </div>
            <div>
                <span className="m text-cyan-700 ">From </span>
                <span className="font-semibold">
                {new Date(filter.from).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                })}
                </span>
                <span className="mx-2 text-cyan-700 ">To</span>

                <span className="font-semibold">
                {new Date(filter.to).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                })}
                </span>
                </div>
            <div className="mb-4 mt-10 flex justify-end gap-4  " >
                <Button onClick={handleCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    type="primary"
                    icon={loading ? <Spin size="small" /> : <DownloadOutlined />}
                    onClick={handleDownload}
                    loading={loading}
                    style={{ background: "#16a34a", borderColor: "#16a34a", minWidth: 140 }}
                >
                    {loading ? "Generating..." : "Download Excel"}
                </Button>
            </div>
        </Modal>
    </>
  );
}