import assert from "node:assert/strict";
import { LocationInUseError } from "../location/domain/errors";
import { LOCATION_ADDRESS_MAX_LENGTH, LOCATION_NAME_MAX_LENGTH } from "../location/domain/limits";
import { DuplicateNameError } from "../shared/duplicate-name-error";
import { NotFoundError } from "../shared/not-found-error";
import { expectInvalidField, expectRejected } from "./helpers";
import { Scenario } from "./scenario";
import { buildLocation } from "./setup";

export const locationScenarios: Scenario[] = [
    {
        title: "A location is created with its fields cleaned",
        kind: "works",
        async run() {
            const { locations } = buildLocation();

            const location = await locations.createLocation("  Centro ", " Calle  5 de Febrero 100 ");

            assert.equal(location.name, "Centro");
            assert.equal(location.address, "Calle 5 de Febrero 100");
            assert.deepEqual(await locations.getLocation(location.id), location);
            console.log("  OK: created ->", location.name, "-", location.address);
        },
    },
    {
        title: "Name and address cannot be empty nor too long",
        kind: "rejected",
        async run() {
            const { locations, repository } = buildLocation();

            await expectInvalidField(() => locations.createLocation("   ", "Calle 1"), "name");
            await expectInvalidField(() => locations.createLocation("Centro", ""), "address");
            await expectInvalidField(() => locations.createLocation("x".repeat(LOCATION_NAME_MAX_LENGTH + 1), "Calle 1"), "name");
            await expectInvalidField(() => locations.createLocation("Centro", "x".repeat(LOCATION_ADDRESS_MAX_LENGTH + 1)), "address");
            assert.equal((await repository.findAll()).length, 0, "nothing must be saved");
            console.log("  OK: four invalid locations rejected");
        },
    },
    {
        title: "Two locations cannot share a name, ignoring case",
        kind: "rejected",
        async run() {
            const { locations, repository } = buildLocation();
            await locations.createLocation("Centro", "Calle 1");

            const error = await expectRejected(() => locations.createLocation("CENTRO", "Calle 2"), DuplicateNameError);
            assert.equal((await repository.findAll()).length, 1);
            console.log("  OK: rejected ->", error.message);
        },
    },
    {
        title: "A location can change its address and keep its own name",
        kind: "works",
        async run() {
            const { locations } = buildLocation();
            const centro = await locations.createLocation("Centro", "Calle 1");

            const updated = await locations.updateLocation(centro.id, { name: "Centro", address: "Calle 2" });

            assert.deepEqual(updated, { id: centro.id, name: "Centro", address: "Calle 2" });
            console.log("  OK: address changed ->", updated.address);
        },
    },
    {
        title: "A location cannot be renamed to another one's name",
        kind: "rejected",
        async run() {
            const { locations } = buildLocation();
            await locations.createLocation("Centro", "Calle 1");
            const norte = await locations.createLocation("Norte", "Calle 2");

            await expectRejected(() => locations.updateLocation(norte.id, { name: "centro" }), DuplicateNameError);
            await expectInvalidField(() => locations.updateLocation(norte.id, { address: "  " }), "address");
            assert.equal((await locations.getLocation(norte.id)).name, "Norte", "must be untouched");
            console.log("  OK: rename to a taken name and blank address rejected");
        },
    },
    {
        title: "Updating or deleting a location that does not exist fails",
        kind: "rejected",
        async run() {
            const { locations } = buildLocation();

            await expectRejected(() => locations.updateLocation("nope", { name: "X" }), NotFoundError);
            await expectRejected(() => locations.deleteLocation("nope"), NotFoundError);
            console.log("  OK: both rejected with NotFoundError");
        },
    },
    {
        title: "A location nobody uses can be deleted",
        kind: "works",
        async run() {
            const { locations, repository } = buildLocation();
            const centro = await locations.createLocation("Centro", "Calle 1");

            await locations.deleteLocation(centro.id);

            assert.equal((await repository.findAll()).length, 0);
            console.log("  OK: unused location deleted");
        },
    },
    {
        title: "A location with staff, orders or inventory cannot be deleted",
        kind: "rejected",
        async run() {
            const { locations, usage } = buildLocation();
            const centro = await locations.createLocation("Centro", "Calle 1");
            usage.markInUse(centro.id);

            const error = await expectRejected(() => locations.deleteLocation(centro.id), LocationInUseError);
            assert.deepEqual(await locations.getLocation(centro.id), centro, "must still exist");
            console.log("  OK: rejected ->", error.message);
        },
    },
];