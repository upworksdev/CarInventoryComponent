const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Vehicle = require('../../models/Vehicle');
const { check, validationResult } = require("express-validator")




//@route  GET api/vehicles
//@desc   This route is to get ALL vehicles from DB
//@access Private

// first we try and find any vehicles and if the db is empty we are throwing back a error 
router.get('/', auth, async (req, res) => {
    try {
        const vehicles = await Vehicle.find().populate('user', ['name', 'email']);
        if (vehicles.length == 0) {
            return res.status(400).json({ errors: [{ msg: 'No Vehicles exist' }] });
        }
        return res.json(vehicles);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error')
    }

});


//@route  GET api/vehicles/users
//@desc   This route is for the users invnetory on the front end! 
//@access Not Private


router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const page_length = parseInt(req.query.page_length);
        const { make, vehicleModel, year, price_min, price_max, mileage_min, mileage_max } = req.query;
        let webVisible = true;
        let query = {};
        if (webVisible)
            query.webVisible = { "$eq": webVisible }
        if (make)
            query.make = { "$eq": make };
        if (vehicleModel)
            query.vehicleModel = { "$eq": vehicleModel };
        if (year)
            query.year = { "$eq": parseInt(year) };
        let price_subquery = {};
        if (price_min != '-Infinity')
            price_subquery = { ...price_subquery, $gt: parseInt(price_min) };
        if (price_max != 'Infinity')
            price_subquery = { ...price_subquery, $lt: parseInt(price_max) };
        if (Object.keys(price_subquery).length !== 0)
            query.price = price_subquery;
        let mileage_subquery = {};
        if (mileage_min != '-Infinity')
            mileage_subquery = { ...mileage_subquery, $gt: parseInt(mileage_min) };
        if (mileage_max != 'Infinity')
            mileage_subquery = { ...mileage_subquery, $lt: parseInt(mileage_max) };
        if (Object.keys(mileage_subquery).length !== 0)
            query.mileage = mileage_subquery;
        const totalPosts = await Vehicle.find(query).countDocuments();

        let limit = page_length;
        if (totalPosts < page * page_length)
            limit = totalPosts - (page - 1) * page_length;
        // query for get vehicles
        Vehicle.find(query).skip((page - 1) * page_length).limit(limit).exec(function (err, vehicles) {
            if (vehicles.length === 0) {
                return res.status(400).json({ errors: [{ msg: 'No Vehicles exist' }] });
            }
            return res.json({ vehicles: vehicles, totalPosts: totalPosts });
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error')
    }

});

//@route  GET api/vehicles/user_filter
//@desc   This route is for the users invnetory on the front end when the filters are applied! 
//@access Not Private

router.get('/user_filters', async (req, res) => {
    try {
        let query = {};
        const { make, vehicleModel, year, price_min, price_max, mileage_min, mileage_max } = req.query;
        let webVisible = true;
        if (webVisible)
            query.webVisible = { "$eq": webVisible }
        if (make)
            query.make = { "$eq": make };
        if (vehicleModel)
            query.vehicleModel = { "$eq": vehicleModel };
        if (year)
            query.year = { "$eq": parseInt(year) };
        let price_subquery = {};
        if (price_min != '-Infinity')
            price_subquery = { ...price_subquery, $gt: parseInt(price_min) };
        if (price_max != 'Infinity')
            price_subquery = { ...price_subquery, $lt: parseInt(price_max) };
        if (Object.keys(price_subquery).length !== 0)
            query.price = price_subquery;
        let mileage_subquery = {};
        if (mileage_min != '-Infinity')
            mileage_subquery = { ...mileage_subquery, $gt: parseInt(mileage_min) };
        if (mileage_max != 'Infinity')
            mileage_subquery = { ...mileage_subquery, $lt: parseInt(mileage_max) };
        if (Object.keys(mileage_subquery).length !== 0)
            query.mileage = mileage_subquery;
        const makeAggregatorOpts = [
            { $match: query },
            {
                $group: {
                    _id: "$make",
                    count: { $sum: 1 }
                }
            }
        ];
        const makeList = await Vehicle.aggregate(makeAggregatorOpts).exec();
        const modelAggregatorOpts = [
            { $match: query },
            {
                $group: {
                    _id: "$vehicleModel",
                    count: { $sum: 1 }
                }
            }
        ];
        const vehicleModelList = await Vehicle.aggregate(modelAggregatorOpts).exec();

        const yearAggregatorOpts = [
            { $match: query },
            {
                $group: {
                    _id: "$year",
                    count: { $sum: 1 }
                }
            }
        ];
        const yearList = await Vehicle.aggregate(yearAggregatorOpts).exec();

        let priceArray = [];
        const maxPriceVehicle = await Vehicle.find().sort({ "price": -1 }).limit(1);
        const maxPrice = maxPriceVehicle[0].price;
        for (let i = 0; i <= Math.ceil(maxPrice / 10000); i++) {
            priceArray.push(i * 10000);
        }
        const priceList = await Vehicle.aggregate([
            { $match: query },
            {
                $bucket: {
                    groupBy: "$price",
                    boundaries: priceArray,
                    default: Number.NEGATIVE_INFINITY,
                    output: {
                        "count": { $sum: 1 }
                    }
                }
            }
        ]).exec();

        let mileageArray = [];
        const maxMileageVehicle = await Vehicle.find().sort({ "mileage": -1 }).limit(1);
        const maxMileage = maxMileageVehicle[0].price;
        for (let i = 0; i <= Math.ceil(maxMileage / 25000); i++) {
            mileageArray.push(i * 25000);
        }
        const mileageList = await Vehicle.aggregate([
            { $match: query },
            {
                $bucket: {
                    groupBy: "$mileage",
                    boundaries: mileageArray,
                    default: Number.NEGATIVE_INFINITY,
                    output: {
                        "count": { $sum: 1 }
                    }
                }
            }
        ]).exec();
        return res.json({ makeList: makeList, vehicleModelList: vehicleModelList, yearList: yearList, priceList: priceList, mileageList: mileageList });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error')
    }

});


//@route  Post api/vehicles/add
//@desc   this route is to just add a vehicle
//@access Private

//This route is to add vehicles 
// add express validator ahahaa 

router.post('/add', [auth, check('vinNumber', 'Vin Number Is Required').not().isEmpty()], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const user = req.user.id;
    const category = req.body.category;
    const stockNumber = req.body.stockNumber;
    const vinNumber = req.body.vinNumber;
    const year = req.body.year;
    const make = req.body.make;
    const otherMake = req.body.otherMake;
    const vehicleModel = req.body.vehicleModel;
    const trimDetail = req.body.trimDetail;
    const mileage = req.body.mileage;
    const unitType = req.body.unitType;
    const odometerAccurate = req.body.odometerAccurate;
    const price = req.body.price;
    const doors = req.body.doors;
    const engine = req.body.engine;
    const engineSize = req.body.engineSize;
    const transmission = req.body.transmission;
    const driveTrain = req.body.driveTrain;
    const exteriorColor = req.body.exteriorColor;
    const interiorColor = req.body.interiorColor;
    const interiorMaterials = req.body.interiorMaterials;
    const fuelType = req.body.fuelType;
    const origin = req.body.origin;
    const purchasedFrom = req.body.purchasedFrom;
    const importedFrom = req.body.importedFrom;
    const importedYear = req.body.importedYear;
    const importedForResale = req.body.importedForResale;
    const exteriorOptions = req.body.exteriorOptions;
    const transportation = req.body.transportation;
    const description = req.body.description;
    const reconditioniongNeeded = req.body.reconditioniongNeeded;
    const damage = req.body.damage;
    const damageAmount = req.body.damageAmount;
    const damageType = req.body.damageType;
    const damageNote = req.body.damageNote;
    const status = req.body.status;
    const location = req.body.location;
    const saleType = req.body.saleType;
    const webVisible = req.body.webVisible;
    const dateListed = req.body.dateListed;
    const datePurchased = req.body.datePurchased;
    const purchasedBy = req.body.purchasedBy;
    const soldBy = req.body.soldBy;
    const boughtPrice = req.body.boughtPrice;
    const soldPrice = req.body.soldPrice;
    const billOfSaleId = req.body.billOfSaleId;
    const profit = req.body.profit;
    const images = req.body.images;


    const newVehicle = new Vehicle({
        user,
        category,
        stockNumber,
        vinNumber,
        year,
        make,
        otherMake,
        vehicleModel,
        trimDetail,
        mileage,
        unitType,
        odometerAccurate,
        price,
        doors,
        engine,
        engineSize,
        transmission,
        driveTrain,
        exteriorColor,
        interiorColor,
        interiorMaterials,
        fuelType,
        origin,
        purchasedFrom,
        importedFrom,
        importedYear,
        importedForResale,
        transportation,
        description,
        reconditioniongNeeded,
        damage,
        damageAmount,
        damageType,
        damageNote,
        status,
        location,
        saleType,
        webVisible,
        dateListed,
        datePurchased,
        purchasedBy,
        soldBy,
        boughtPrice,
        soldPrice,
        billOfSaleId,
        profit,
        images
    });


    try {
        const vehicle = await Vehicle.findOne({ vinNumber: req.body.vinNumber })
        if (vehicle) {
            const filter = {
                vinNumber: req.body.vinNumber,
            }
            const updatedVehicle = {

                user: req.user.id,
                category: req.body.category,
                stockNumber: req.body.stockNumber,
                vinNumber: req.body.vinNumber,
                year: req.body.year,
                make: req.body.make,
                otherMake: req.body.otherMake,
                vehicleModel: req.body.vehicleModel,
                trimDetail: req.body.trimDetail,
                mileage: req.body.mileage,
                unitType: req.body.unitType,
                odometerAccurate: req.body.odometerAccurate,
                price: req.body.price,
                doors: req.body.doors,
                engine: req.body.engine,
                engineSize: req.body.engineSize,
                transmission: req.body.transmission,
                driveTrain: req.body.driveTrain,
                exteriorColor: req.body.exteriorColor,
                interiorColor: req.body.interiorColor,
                interiorMaterials: req.body.interiorMaterials,
                fuelType: req.body.fuelType,
                origin: req.body.origin,
                purchasedFrom: req.body.purchasedFrom,
                importedFrom: req.body.importedFrom,
                importedYear: req.body.importedYear,
                importedForResale: req.body.importedForResale,
                exteriorOptions: req.body.exteriorOptions,
                transportation: req.body.transportation,
                description: req.body.description,
                reconditioniongNeeded: req.body.reconditioniongNeeded,
                damage: req.body.damage,
                damageAmount: req.body.damageAmount,
                damageType: req.body.damageType,
                damageNote: req.body.damageNote,
                status: req.body.status,
                location: req.body.location,
                saleType: req.body.saleType,
                webVisible: req.body.webVisible,
                dateListed: req.body.dateListed,
                datePurchased: req.body.datePurchased,
                purchasedBy: req.body.purchasedBy,
                soldBy: req.body.soldBy,
                boughtPrice: req.body.boughtPrice,
                soldPrice: req.body.soldPrice,
                billOfSaleId: req.body.billOfSaleId,
                profit: req.body.profit,
            }

            if (req.body.year != null) { updatedVehicle.year = req.body.year };



            let vehicle = await Vehicle.findOneAndUpdate(filter, { $set: updatedVehicle }, {
                new: true
            });
            return res.json(vehicle);

        }

        await newVehicle.save();
        res.json(newVehicle)
    }


    catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error , Could Not Add Vehicle')
    }

});


//@route  GET api/vehicles/:vehicle_id
//@desc   this route is to just get a vehicle by its vinNumber  
//@access Use this route to edit vehicles on the backend

// first we try and find any vehicles and if the db is empty we are throwing back a error 
router.get('/:vehicleVin', auth, async (req, res) => {
    try {
        const vehicle = await Vehicle.find({ vinNumber: req.params.vehicleVin })
        if (!vehicle) {
            return res.status(400).json({ errors: [{ msg: 'Vehicle Not Found By Vin Number' }] });
        }
        return res.json(vehicle);
        return res.json(vehicle);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Couldnt Find Vehicle')
    }

});


//@route  GET api/vehicles/:vehicle_id
//@desc   this route is to just get a vehicle by its vinNumber ONLY FOR THE USERS!!!!  _ THIS NEEDS TO BE CHANGED TO RETURN AN OBJECT 
//@access Use this route to edit vehicles on the backend

// first we try and find any vehicles and if the db is empty we are throwing back a error 
router.get('/users/:vehicleVin', async (req, res) => {
    try {
        const vehicle = await Vehicle.find({ vinNumber: req.params.vehicleVin })
        if (!vehicle) {
            return res.status(400).json({ errors: [{ msg: 'Vehicle Not Found By Vin Number' }] });
        }
        return res.json(vehicle);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Couldnt Find Vehicle')
    }

});


//@route  DELETE api/vehicles/:vehicle_id
//@desc   this route is to delete a vehicle based on vinNUmber given since that is the primary key to us 
//@access Defs private 

// first we try and find any vehicles and if the db is empty we are throwing back a error 
router.delete('/delete/:vinNumber', auth, async (req, res) => {
    try {
        // remove the vehicle based on the param in the url
        const vehicle = await Vehicle.findOneAndRemove({ vinNumber: req.params.vinNumber });
        return res.json({ msg: "Vehicle was removed" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Vehicle Could Not Be Removed, Server Error')
    }

});



module.exports = router;
