import {SLOT_MINUTES} from "./time";

const SLOT_MILLISECONDS = SLOT_MINUTES * 60_000

export function getBookingSlotStarts(startAt: Date, endAt: Date) {
	const starts: Date[] = []

	for (
		let timestamp = startAt.getTime();
		timestamp < endAt.getTime();
		timestamp += SLOT_MILLISECONDS
	) {
		starts.push(new Date(timestamp));
	}

	return starts;
}