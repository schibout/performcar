import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape } from "../i18n-strings";
import {
  closedTicketDetail,
  injectSession,
  mockMe,
  mockUserClose,
  mockUserReply,
  mockUserTicketDetail,
  mockUserTickets,
  regularUser,
  ticketDetail,
  ticketListItem,
  userMessage,
} from "./support-helpers";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`User support list [${locale}]`, () => {
    test("SEO - has the localized title and description", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTickets(page, { list: [] });

      await page.goto(`/${locale}/support`);

      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.support.title), "i"));
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        s.seo.support.description,
      );
    });

    test("renders the caller's tickets with subject and status", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTickets(page, { list: [ticketListItem] });

      await page.goto(`/${locale}/support`);

      await expect(page.getByRole("heading", { name: s.support.list.title })).toBeVisible();
      await expect(page.getByText(ticketListItem.subject)).toBeVisible();
      await expect(page.getByText(s.support.status.open).first()).toBeVisible();
    });

    test("shows the empty state when there are no tickets", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTickets(page, { list: [] });

      await page.goto(`/${locale}/support`);

      await expect(page.getByText(s.support.list.empty)).toBeVisible();
    });

    test("creating a ticket navigates to its detail page", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTickets(page, { list: [], created: ticketDetail });
      await mockUserTicketDetail(page, ticketDetail);

      await page.goto(`/${locale}/support`);
      await page.getByRole("button", { name: s.support.list.newTicket }).click();

      await page.getByPlaceholder(s.support.new.subjectPlaceholder).fill("Cannot sign in");
      await page
        .getByPlaceholder(s.support.new.bodyPlaceholder)
        .fill("I cannot sign in to my account at all");
      await page.getByRole("button", { name: s.support.new.submit }).click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/support/${ticketDetail.id}`));
      await expect(page.getByRole("heading", { name: ticketDetail.subject })).toBeVisible();
    });

    test("row click opens the ticket detail", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTickets(page, { list: [ticketListItem] });
      await mockUserTicketDetail(page, ticketDetail);

      await page.goto(`/${locale}/support`);
      await page.getByText(ticketListItem.subject).click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/support/${ticketDetail.id}`));
      await expect(page.getByText(userMessage.body)).toBeVisible();
    });
  });

  test.describe(`User ticket detail [${locale}]`, () => {
    test("renders the full message thread", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTicketDetail(page, ticketDetail);

      await page.goto(`/${locale}/support/${ticketDetail.id}`);

      await expect(page.getByRole("heading", { name: ticketDetail.subject })).toBeVisible();
      await expect(page.getByText(ticketDetail.messages[0].body)).toBeVisible();
      await expect(page.getByText(ticketDetail.messages[1].body)).toBeVisible();
    });

    test("sending a reply clears the input", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTicketDetail(page, ticketDetail);
      await mockUserReply(page, userMessage);

      await page.goto(`/${locale}/support/${ticketDetail.id}`);

      const input = page.getByPlaceholder(s.support.detail.replyPlaceholder);
      await input.fill("Any update on this?");
      await page.getByRole("button", { name: s.support.detail.send }).click();

      await expect(input).toHaveValue("");
    });

    test("a closed ticket hides the reply box and shows a notice", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTicketDetail(page, closedTicketDetail);

      await page.goto(`/${locale}/support/${closedTicketDetail.id}`);

      await expect(page.getByText(s.support.detail.closedNotice)).toBeVisible();
      await expect(page.getByPlaceholder(s.support.detail.replyPlaceholder)).toHaveCount(0);
    });

    test("closing a ticket switches it to the closed state", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTicketDetail(page, ticketDetail);
      await mockUserClose(page, ticketDetail);

      await page.goto(`/${locale}/support/${ticketDetail.id}`);
      await page.getByRole("button", { name: s.support.detail.close }).click();

      await expect(page.getByText(s.support.detail.closedNotice)).toBeVisible();
    });
  });
}
