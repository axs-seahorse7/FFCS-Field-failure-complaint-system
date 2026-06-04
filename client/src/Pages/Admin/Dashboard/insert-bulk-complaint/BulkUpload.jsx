import { Upload, message, Card } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import axios from "axios";
import api from "../../../../services/axios-interceptore/api";

const { Dragger } = Upload;

export default function BulkUpload() {
  const baseUri = import.meta.env.VITE_API_URI || "http://localhost:3000/api";
  const props = {
    name: "file",
    multiple: false,
    accept: ".xlsx,.xls",

    customRequest: async ({ file, onSuccess, onError }) => {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await axios.post(`${baseUri}/bulk-upload`, formData, {
          // Tell axios to treat any response body as a raw binary blob
          responseType: "blob",
        });

        const contentType = res.headers["content-type"] || "";

        // Server returned a failed-rows xlsx (HTTP 207)
        if (contentType.includes("spreadsheetml") || res.status === 207) {
          const inserted = res.headers["x-inserted-count"] ?? "?";
          const failedCount = res.headers["x-failed-count"] ?? "?";

          // Trigger browser download
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement("a");
          link.href = url;

          // Pull filename from Content-Disposition if available, else use a fallback
          const disposition = res.headers["content-disposition"] || "";
          const match = disposition.match(/filename="?([^"]+)"?/);
          link.download = match ? match[1] : "failed_rows.xlsx";

          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          message.warning(
            `Inserted: ${inserted} rows. ${failedCount} rows failed — check the downloaded file, fix and re-upload.`
          );
          onSuccess(res.data);
          return;
        }

        // Normal JSON success path — parse the blob back to JSON
        const text = await res.data.text();
        const json = JSON.parse(text);
        message.success(`Uploaded: ${json.inserted} rows successfully`);
        onSuccess(json);
      } catch (err) {
        message.error("Upload failed");
        onError(err);
      }
    },
  };


  return (
    <Card title="Bulk Complaint Upload">
      <Dragger {...props} style={{ padding: 20 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag Excel file to upload
        </p>
        <p className="ant-upload-hint">
          Supports .xlsx / .xls files only
        </p>
      </Dragger>
    </Card>
  );
}