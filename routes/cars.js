import createDebug from 'debug'
import sanitizeBody from '../middleware/sanitizeBody.js'
import Car from '../models/Car.js'
import express from 'express'

const debug = createDebug('week9:routes:cars')
const router = express.Router()

router.get('/', async (req, res) => {
  const collection = await Car.find().populate('owner')
  res.send({ data: formatResponseData(collection) })
})

router.post('/', sanitizeBody, async (req, res) => {
  let newCar = new Car(req.sanitizedBody)
  try {
    await newCar.save()
    res.status(201).json({ data: formatResponseData(newCar) })
  } catch (err) {
    debug(err)
    res.status(500).send({
      errors: [
        {
          status: '500',
          title: 'Server error',
          description: 'Problem saving document to the database.',
        },
      ],
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id).populate('owner')
    if (!car) throw new Error('Resource not found')
    res.json({ data: formatResponseData(car) })
  } catch (err) {
    sendResourceNotFound(req, res)
  }
})

const update =
  (overwrite = false) =>
  async (req, res) => {
    try {
      const car = await Car.findByIdAndUpdate(
        req.params.id,
        req.sanitizedBody,
        {
          new: true,
          overwrite,
          runValidators: true,
        }
      )
      if (!car) throw new Error('Resource not found')
      res.json({ data: formatResponseData(car) })
    } catch (err) {
      sendResourceNotFound(req, res)
    }
  }
router.put('/:id', sanitizeBody, update(true))
router.patch('/:id', sanitizeBody, update(false))

router.delete('/:id', async (req, res) => {
  try {
    const car = await Car.findByIdAndRemove(req.params.id)
    if (!car) throw new Error('Resource not found')
    res.json({ data: formatResponseData(car) })
  } catch (err) {
    sendResourceNotFound(req, res)
  }
})

/**
 * Format the response data object according to JSON:API v1.0
 * @param {string} type The resource collection name, e.g. 'cars'
 * @param {Object | Object[]} payload An array or instance object from that collection
 * @returns
 */
function formatResponseData(payload, type = 'cars') {
  if (payload instanceof Array) {
    return payload.map((resource) => format(resource))
  } else {
    return format(payload)
  }

  function format(resource) {
    const { _id, ...attributes } = resource.toObject()
    return { type, id: _id, attributes }
  }
}

function sendResourceNotFound(req, res) {
  res.status(404).send({
    error: [
      {
        status: '404',
        title: 'Resource does nto exist',
        description: `We could not find a car with id: ${req.params.id}`,
      },
    ],
  })
}

export default router
