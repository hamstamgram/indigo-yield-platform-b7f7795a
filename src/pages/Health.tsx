const Health = () => {
  const timestamp = new Date().toISOString();

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Health Check</h1>
      <p>OK {timestamp}</p>
    </div>
  );
};

export default Health;
