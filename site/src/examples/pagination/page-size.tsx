import { Pagination } from "@senvenli/react/navigation";
import { useState } from "react";

export default function Example() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      total={312}
      pageSizeOptions={[10, 25, 50]}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
}
