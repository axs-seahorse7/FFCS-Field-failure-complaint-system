import React from "react";
import { Layout, Skeleton, Card, Row, Col } from "antd";

const { Header, Sider, Content } = Layout;

export default function SkeletonDashboard() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider width={220} style={{ background: "#fff", padding: 16 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Sider>

      <Layout>
        {/* Navbar */}
        <Header style={{ background: "#fff", padding: "0 20px" }}>
          <Skeleton active title={false} paragraph={{ rows: 1, width: "60%" }} />
        </Header>

        {/* Content */}
        <Content style={{ margin: 20 }}>
          <Row gutter={[16, 16]}>
            {/* Trends Cards */}
            <Col span={8}>
              <Card>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>

            {/* Charts Section */}
            <Col span={16}>
              <Card title="Charts">
                <Skeleton active paragraph={{ rows: 6 }} />
              </Card>
            </Col>

            {/* Pie Chart Section */}
            <Col span={8}>
              <Card title="Pie Chart">
                <Skeleton active paragraph={{ rows: 6 }} />
              </Card>
            </Col>

            {/* Extra Section */}
            <Col span={24}>
              <Card title="Recent Activity">
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
}
