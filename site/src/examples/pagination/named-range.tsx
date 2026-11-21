import { Pagination } from "@senvenli/react/navigation";
import { useState } from "react";

// Name the locale: a bare `toLocaleString()` would differ between the server and the browser.
const number = new Intl.NumberFormat("en-US");

export default function Example() {
  const [page, setPage] = useState(3);
  return (
    <Pagination
      page={page}
      pageSize={20}
      total={1204}
      onPageChange={setPage}
      formatRange={(from, to, total) => `${number.format(from)}–${number.format(to)} of ${number.format(total)} orders`}
    />
  );
}
