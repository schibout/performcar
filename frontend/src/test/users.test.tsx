import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useUsers } from "@/hooks/api/use-users";
import { createWrapper } from "@/test/test-utils";

// A small component to test integration with useUsers and MSW
const UsersList = () => {
  const { data: users, isLoading, isError } = useUsers();

  if (isLoading) return <div>Loading users...</div>;
  if (isError) return <div>Error loading users</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>
          {user.first_name} {user.last_name}
        </li>
      ))}
    </ul>
  );
};

describe("Users Integration with MSW", () => {
  it("should fetch and display users from MSW handlers", async () => {
    render(<UsersList />, { wrapper: createWrapper() });

    // Should show loading initially
    expect(screen.getByText(/Loading users.../i)).toBeInTheDocument();

    // Should show users from handlers.ts (John Doe, Jane Doe)
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    });
  });
});
