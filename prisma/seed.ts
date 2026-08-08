import { getBookingSlotStarts } from '@/modules/bookings/slots'
import { hashPassword } from '@/server/auth/password'
import { prisma } from '@/server/db/prisma'

const rooms = [
	{ name: 'Акваріум', floor: 1, capacity: 4 },
	{ name: 'Марс', floor: 2, capacity: 6 },
	{ name: 'Гагарін', floor: 2, capacity: 8 },
	{ name: 'Леся', floor: 3, capacity: 4 },
	{ name: 'Дніпро', floor: 3, capacity: 10 },
	{ name: 'Обрій', floor: 4, capacity: 12 }
]

const demoEmailVerifiedAt = new Date('2026-01-01T00:00:00.000Z')

type DemoBooking = {
	id: string
	title: string
	startAt: Date
	endAt: Date
	userId: string
	roomId: string
}

async function upsertDemoBooking(booking: DemoBooking) {
	const { id, title, startAt, endAt, userId, roomId } = booking

	const slots = getBookingSlotStarts(startAt, endAt).map(startsAt => ({
		roomId,
		startsAt
	}))

	return prisma.booking.upsert({
		where: {
			id
		},
		update: {
			title,
			startAt,
			endAt,
			user: {
				connect: {
					id: userId
				}
			},
			room: {
				connect: {
					id: roomId
				}
			},
			slots: {
				deleteMany: {},
				createMany: {
					data: slots
				}
			}
		},
		create: {
			id,
			title,
			startAt,
			endAt,
			user: {
				connect: {
					id: userId
				}
			},
			room: {
				connect: {
					id: roomId
				}
			},
			slots: {
				createMany: {
					data: slots
				}
			}
		}
	})
}

function utcAt(dayOffset: number, hour: number) {
	const value = new Date()

	value.setUTCDate(value.getUTCDate() + dayOffset)
	value.setUTCHours(hour, 0, 0, 0)

	return value
}

async function main() {
	const passwordHash = await hashPassword('Potuzhno123')

	const [andriy, pavlo] = await Promise.all([
		prisma.user.upsert({
			where: { email: 'andriy@example.com' },
			update: {
				name: 'Андрій',
				passwordHash,
				emailVerifiedAt: demoEmailVerifiedAt
			},
			create: {
				name: 'Андрій',
				email: 'andriy@example.com',
				passwordHash,
				emailVerifiedAt: demoEmailVerifiedAt
			}
		}),
		prisma.user.upsert({
			where: { email: 'pavlo@example.com' },
			update: {
				name: 'Павло',
				passwordHash,
				emailVerifiedAt: demoEmailVerifiedAt
			},
			create: {
				name: 'Павло',
				email: 'pavlo@example.com',
				passwordHash,
				emailVerifiedAt: demoEmailVerifiedAt
			}
		})
	])

	const seededRooms = await Promise.all(
		rooms.map(room =>
			prisma.room.upsert({
				where: { name: room.name },
				update: {
					floor: room.floor,
					capacity: room.capacity
				},
				create: room
			})
		)
	)

	const aquarium = seededRooms.find(room => room.name === 'Акваріум')
	const mars = seededRooms.find(room => room.name === 'Марс')

	if (!aquarium || !mars) {
		throw new Error('Required seed rooms were not created')
	}

	const demoBookings = [
		{
			id: 'demo-future-andriy',
			title: 'Командний sync',
			startAt: utcAt(1, 10),
			endAt: utcAt(1, 11),
			userId: andriy.id,
			roomId: aquarium.id
		},
		{
			id: 'demo-future-pavlo',
			title: 'Планування',
			startAt: utcAt(2, 12),
			endAt: utcAt(2, 13),
			userId: pavlo.id,
			roomId: mars.id
		},
		{
			id: 'demo-past-andriy',
			title: 'Ретро',
			startAt: utcAt(-1, 10),
			endAt: utcAt(-1, 11),
			userId: andriy.id,
			roomId: mars.id
		}
	] satisfies DemoBooking[]

	await Promise.all(demoBookings.map(upsertDemoBooking))

	console.log('Seeded 6 rooms, 2 users and 3 bookings')
}

main()
	.catch(error => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
