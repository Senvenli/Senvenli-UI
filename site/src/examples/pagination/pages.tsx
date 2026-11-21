import { Pagination } from "@senvenli/react/navigation";
import { useState } from "react";

export default function Example() {
  const [page, setPage] = useState(3);
  return <Pagination page={page} pageSize={20} total={1204} onPageChange={setPage} />;
}
