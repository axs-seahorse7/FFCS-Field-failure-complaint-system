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
        const res = await axios.post(`${baseUri}/bulk-upload`, formData);
        message.success(`Uploaded: ${res.data.inserted}`);
        onSuccess(res.data);
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