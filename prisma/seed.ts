import { prisma } from '@/server/db/prisma'
import bcrypt from 'bcrypt'

const rooms = [
	{ name: 'Акваріум', floor: 1, capacity: 4 },
	{ name: 'Марс', floor: 2, capacity: 6 },
	{ name: 'Гагарін', floor: 2, capacity: 8 },
	{ name: 'Леся', floor: 3, capacity: 4 },
	{ name: 'Дніпро', floor: 3, capacity: 10 },
	{ name: 'Обрій', floor: 4, capacity: 12 }
]

function utcAt(dayOffset: number, hour: number) {
	const value = new Date()

	value.setUTCDate(value.getUTCDate() + dayOffset)
	value.setUTCHours(hour, 0, 0, 0)

	return value
}

async function main() {
	const passwordHash = await bcrypt.hash('Potuzhno123!', 12)

	const [andriy, pavlo] = await Promise.all([
		prisma.user.upsert({
			where: { email: 'andriy@example.com' },
			update: {
				name: 'Андрій',
				passwordHash
			},
			create: {
				name: 'Андрій',
				email: 'andriy@example.com',
				passwordHash
			}
		}),
		prisma.user.upsert({
			where: { email: 'pavlo@example.com' },
			update: {
				name: 'Павло',
				passwordHash
			},
			create: {
				name: 'Павло',
				email: 'pavlo@example.com',
				passwordHash
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

	await Promise.all([
		prisma.booking.upsert({
			where: { id: 'demo-future-andriy' },
			update: {
				title: 'Щотижневий sync',
				startAt: utcAt(1, 10),
				endAt: utcAt(1, 11),
				userId: andriy.id,
				roomId: aquarium.id
			},
			create: {
				id: 'demo-future-andriy',
				title: 'Щотижневий sync',
				startAt: utcAt(1, 10),
				endAt: utcAt(1, 11),
				userId: andriy.id,
				roomId: aquarium.id
			}
		}),
		prisma.booking.upsert({
			where: { id: 'demo-future-pavlo' },
			update: {
				title: 'Планування',
				startAt: utcAt(2, 12),
				endAt: utcAt(2, 13),
				userId: pavlo.id,
				roomId: mars.id
			},
			create: {
				id: 'demo-future-pavlo',
				title: 'Планування',
				startAt: utcAt(2, 12),
				endAt: utcAt(2, 13),
				userId: pavlo.id,
				roomId: mars.id
			}
		}),
		prisma.booking.upsert({
			where: { id: 'demo-past-andriy' },
			update: {
				title: 'Ретро',
				startAt: utcAt(-1, 10),
				endAt: utcAt(-1, 11),
				userId: andriy.id,
				roomId: mars.id
			},
			create: {
				id: 'demo-past-andriy',
				title: 'Ретро',
				startAt: utcAt(-1, 10),
				endAt: utcAt(-1, 11),
				userId: andriy.id,
				roomId: mars.id
			}
		})
	])

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
